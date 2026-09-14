"""Test helpers for Standard content scanning and CyberTipline reports: a gateway with an open-tier enclave and a
simulated worker, generated media, and a fake NCMEC CyberTipline server."""

from __future__ import annotations

import base64
import email.parser
import email.policy
import hashlib
import json
import shutil
import subprocess
import threading
import time
import uuid
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace

from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import b64d, b64e, canonical_json, sha256_hex
from kuno_protocol.crypto import RecipientSession, generate_hpke_keypair, generate_signing_key, public_key_bytes
from kuno_protocol.profiles import InputRole, Mode
from kuno_protocol.receipts import ReceiptBody, VideoInfo, sign_receipt
from kuno_protocol.schemas import GenerationParams, JobState, input_label, job_aad, output_label
from kuno_protocol.sealed_payload import open_payload

from operator_sessions import operator_headers

from kuno_gateway import identity, ledger
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Blob, Enclave, Job, User
from kuno_gateway.settings import Settings

ENCLAVE = "s" * 32
ADMIN = "carol@kunoworld.test"
MODERATOR = "mo@kunoworld.test"
TEXT = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24)
IMAGE = TEXT.model_copy(update={"mode": Mode.IMAGE_TO_VIDEO, "input_roles": [InputRole.FIRST_FRAME]})


def ffmpeg(*args, out) -> bytes:
    subprocess.run([shutil.which("ffmpeg"), "-hide_banner", "-loglevel", "error", "-y", *map(str, args), str(out)], check=True)
    return out.read_bytes()


def make_media(d) -> SimpleNamespace:
    """Structured test pictures and clips (ffmpeg's lavfi sources), and near-duplicates of them."""
    picture = ffmpeg("-f", "lavfi", "-i", "testsrc2=size=640x360:rate=1", "-frames:v", "1", out=d / "picture.png")
    # A video showing the picture, resized and H.264-encoded: how a known image turns up inside a generated video.
    # (testsrc2's own frames change too much from one frame to the next to stand in for a fixed image.)
    still = ["-loop", "1", "-i", d / "picture.png", "-t", "2", "-r", "24", "-vf", "scale=320:180", "-c:v", "libx264",
             "-preset", "ultrafast", "-pix_fmt", "yuv420p"]
    return SimpleNamespace(
        picture=picture,
        # The same picture resized and recompressed as JPEG: a different file, the same image to PDQ.
        picture_jpeg=ffmpeg("-i", d / "picture.png", "-vf", "scale=480:270", "-q:v", "12", out=d / "picture.jpg"),
        unrelated=ffmpeg("-f", "lavfi", "-i", "mandelbrot=size=640x360:rate=1", "-frames:v", "1", out=d / "unrelated.png"),
        clip=ffmpeg(*still, "-movflags", "+faststart", out=d / "clip.mp4"),
        # No moov-at-front: needs a seekable input.
        clip_no_faststart=ffmpeg(*still, out=d / "clip-slow.mp4"),
        other_clip=ffmpeg("-f", "lavfi", "-i", "mandelbrot=size=320x176:rate=24", "-t", "2", "-c:v", "libx264", "-preset",
                          "ultrafast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out=d / "other.mp4"),
        red=ffmpeg("-f", "lavfi", "-i", "color=red:s=64x36", "-frames:v", "1", out=d / "red.png"),
    )


def make_gateway(tmp_path, monkeypatch, **overrides) -> SimpleNamespace:
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "0")
    data = tmp_path / "data"
    env = devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    for key, value in overrides.items():
        setattr(settings, key, value)
    app = create_app(settings)
    state = app.state.gw
    hpke_private, hpke_public = generate_hpke_keypair()
    signing = generate_signing_key()
    now = time.time()
    with state.session() as s, s.begin():
        s.add(Enclave(
            id=ENCLAVE, miner_hotkey="5OpenMiner", tee="open", image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key=b64e(hpke_public),
            signing_public_key=b64e(public_key_bytes(signing)), profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}",
            capacity=4, inflight=0, status="active", verified_at=now, last_seen=now,
        ))
    return SimpleNamespace(
        app=app, client=TestClient(app), state=state, settings=settings, data=data, hpke_private=hpke_private, signing=signing,
        dev={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"},
        admin=operator_headers(state, ADMIN, "admin"), moderator=operator_headers(state, MODERATOR, "moderator"),
    )


def new_account(gw, email: str | None = None) -> tuple[str, dict]:
    """A customer account owned by a signed-up user (with an email), holding $50 of operator credit."""
    account_id, user_id, now = uuid.uuid4().hex, uuid.uuid4().hex, time.time()
    with gw.state.session() as s, s.begin():
        s.add(User(id=user_id, email=email or f"{user_id[:8]}@example.com", created_at=now))
        s.add(Account(id=account_id, name="customer", owner_user_id=user_id, balance_micros=0, is_validator=False, created_at=now))
        s.flush()
        key, _ = identity.create_api_key(s, account_id, "t")
        ledger.post(s, account_id, ledger.to_micros(50), kind=ledger.ADJUSTMENT, source="admin", idempotency_key=f"admin:{account_id}")
    return account_id, {"authorization": f"Bearer {key}"}


def create_standard(gw, headers, prompt: str = "a lighthouse at dusk") -> dict:
    created = gw.client.post("/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": prompt}, headers=headers)
    assert created.status_code == 201, created.text
    return created.json()


def render(gw, job_id: str, video: bytes) -> None:
    """What a worker does: open the sealed request, seal the output to the job's output key, sign a receipt, complete."""
    with gw.state.session() as s:
        job = s.get(Job, job_id)
    blob_ids = json.loads(job.input_blob_ids)
    params = GenerationParams.model_validate_json(job.params)
    session = RecipientSession(gw.hpke_private, b64d(job.enc))
    open_payload(session, b64d(job.ciphertext), job_aad(job_id, ENCLAVE, params, blob_ids))
    for i, b in enumerate(blob_ids):
        decrypt_blob(session.input_key, input_label(job_id, i), gw.state.blobs.get(b))
    sealed = encrypt_blob(session.output_key, output_label(job_id), video)
    now = time.time()
    body = ReceiptBody(
        job_id=job_id, enclave_id=ENCLAVE, profile_id=job.profile_id, image_digest=devkit.DEV_IMAGE_DIGEST,
        params_digest=sha256_hex(canonical_json(params.model_dump(mode="json"))), input_digest="0" * 64,
        output_digest=sha256_hex(sealed), output_bytes=len(sealed), content_digest=sha256_hex(video),
        attestation_digest="0" * 64, started_at=now, finished_at=now, gpu_seconds=1.0,
        video=VideoInfo(duration_s=2, width=320, height=176, fps=24, frames=48, audio=False),
    )
    receipt = sign_receipt(gw.signing, body)
    with gw.state.session() as s, s.begin():
        job = s.get(Job, job_id)
        job.status, job.started_at = JobState.RUNNING.value, now
        blob_id, digest, size = gw.state.blobs.put(sealed)
        s.add(Blob(id=blob_id, owner_kind="enclave", owner_id=ENCLAVE, job_id=job_id, size=size, sha256=digest, created_at=now,
                   expires_at=now + 3600))
        job.output_blob_id, job.receipt, job.content_digest = blob_id, receipt.model_dump_json(), body.content_digest
        gw.state.finish_job(s, job, JobState.SUCCEEDED)


# ------------------------------------------------------------------ a fake NCMEC CyberTipline server


def _form(content_type: str, body: bytes) -> dict[str, tuple[str | None, bytes]]:
    message = email.parser.BytesParser(policy=email.policy.HTTP).parsebytes(
        f"Content-Type: {content_type}\r\n\r\n".encode() + body
    )
    fields = {}
    for part in message.iter_parts():
        name = part.get_param("name", header="content-disposition")
        fields[name] = (part.get_filename(), part.get_payload(decode=True) or b"")
    return fields


class FakeNcmec:
    """The documented ESP reporting calls under /ispws, with HTTP Basic auth, answering reportResponse XML.

    `fail` maps a call name (submit, upload, fileinfo, finish, retract) to a list of response codes to answer, one per
    call, before answering normally; the code "drop" closes the connection without answering.
    """

    USERNAME, PASSWORD = "esp-test-user", "esp-test-password"

    def __init__(self):
        self.calls: list[tuple[str, dict]] = []
        self.fail: dict[str, list] = {}
        self.reports: dict[str, dict] = {}
        self._next = 1000
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):  # quiet
                pass

            def do_POST(self):  # noqa: N802
                fake._handle(self)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.base_url = f"http://127.0.0.1:{self.server.server_address[1]}/ispws"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.server.shutdown()
        self.server.server_close()

    def count(self, name: str) -> int:
        return sum(1 for call, _ in self.calls if call == name)

    def _answer(self, handler, status: int, xml: str) -> None:
        body = xml.encode()
        handler.send_response(status)
        handler.send_header("content-type", "text/xml; charset=utf-8")
        handler.send_header("request-id", uuid.uuid4().hex)
        handler.send_header("content-length", str(len(body)))
        handler.end_headers()
        handler.wfile.write(body)

    def _response(self, handler, code: int = 0, description: str = "Success", **fields) -> None:
        extra = "".join(f"<{k}>{v}</{k}>" for k, v in fields.items())
        self._answer(handler, 200, f"<reportResponse><responseCode>{code}</responseCode>"
                                   f"<responseDescription>{description}</responseDescription>{extra}</reportResponse>")

    def _handle(self, handler) -> None:
        expected = "Basic " + base64.b64encode(f"{self.USERNAME}:{self.PASSWORD}".encode()).decode()
        length = int(handler.headers.get("content-length") or 0)
        body = handler.rfile.read(length)
        if handler.headers.get("authorization") != expected:
            handler.send_response(401)
            handler.send_header("www-authenticate", 'Basic realm="Realm"')
            handler.send_header("content-length", "0")
            handler.end_headers()
            return
        name = handler.path.rsplit("/", 1)[-1]
        queued = self.fail.get(name) or []
        if queued:
            code = queued.pop(0)
            self.calls.append((name, {"failed": code}))
            if code == "drop":
                handler.close_connection = True
                handler.connection.shutdown(2)
                return
            return self._response(handler, code, "Injected failure")
        ctype = handler.headers.get("content-type", "")
        if name == "submit":
            assert ctype.startswith("text/xml"), ctype
            root = ET.fromstring(body)
            self._next += 1
            report_id = str(self._next)
            self.reports[report_id] = {"xml": body, "files": {}, "finished": False, "retracted": False}
            self.calls.append((name, {"report_id": report_id, "root": root.tag}))
            return self._response(handler, reportId=report_id)
        if name == "fileinfo":
            root = ET.fromstring(body)
            report = self.reports.get(root.findtext("reportId"))
            if report is None or root.findtext("fileId") not in report["files"]:
                return self._response(handler, 5002, "File does not exist")
            report["files"][root.findtext("fileId")]["details"] = body
            self.calls.append((name, {"report_id": root.findtext("reportId"), "file_id": root.findtext("fileId")}))
            return self._response(handler, reportId=root.findtext("reportId"))
        fields = _form(ctype, body)
        report_id = fields.get("id", (None, b""))[1].decode()
        report = self.reports.get(report_id)
        if report is None:
            self.calls.append((name, {"report_id": report_id, "missing": True}))
            return self._response(handler, 5001, "Report does not exist")
        if name == "upload":
            filename, data = fields["file"]
            file_id = uuid.uuid4().hex
            report["files"][file_id] = {"name": filename, "data": data}
            self.calls.append((name, {"report_id": report_id, "file_id": file_id, "size": len(data)}))
            return self._response(handler, reportId=report_id, fileId=file_id, hash=hashlib.md5(data).hexdigest())
        if name == "finish":
            if report["finished"]:
                return self._response(handler, 5102, "Report already finished")
            report["finished"] = True
            self.calls.append((name, {"report_id": report_id}))
            files = "".join(f"<fileId>{f}</fileId>" for f in report["files"])
            return self._answer(handler, 200, f"<reportDoneResponse><responseCode>0</responseCode><reportId>{report_id}</reportId>"
                                              f"<files>{files}</files></reportDoneResponse>")
        if name == "retract":
            if report["finished"]:
                return self._response(handler, 5102, "Report already finished")
            report["retracted"] = True
            self.calls.append((name, {"report_id": report_id}))
            return self._response(handler, reportId=report_id)
        return self._response(handler, 4000, "Invalid request")


def use_fake_ncmec(gw, fake: FakeNcmec, env: str = "test") -> None:
    gw.settings.cybertip_env = env
    gw.settings.cybertip_base_url = fake.base_url
    gw.settings.cybertip_username, gw.settings.cybertip_password = FakeNcmec.USERNAME, FakeNcmec.PASSWORD


__all__ = ["ADMIN", "ENCLAVE", "IMAGE", "MODERATOR", "TEXT", "FakeNcmec", "create_standard", "ffmpeg", "make_gateway",
           "make_media", "new_account", "render", "use_fake_ncmec"]
