"""The gateway seals a Standard job the way a client does, in the padded request form, and the worker's own opening
path accepts it: the prompt, seed and options reach the model, the ciphertext's size doesn't follow the prompt's
length, and the output opens with the key the gateway keeps."""

from __future__ import annotations

import hashlib
import uuid
from types import SimpleNamespace

import pytest

from kuno_gateway import standard_jobs
from kuno_protocol.attestation import MockTEE
from kuno_protocol.blobs import decrypt_blob
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.crypto import RecipientSession, generate_signing_key
from kuno_protocol.devkit import DEV_IMAGE_DIGEST
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, MinerJob, job_aad, output_label
from kuno_protocol.sealed_payload import MAX_JSON_LEN, MIN_PADDED, PAYLOAD_V2, PayloadTooLarge, payload_version
from kuno_worker.backends.mock import MockBackend
from kuno_worker.config import WorkerConfig
from kuno_worker.worker import Worker

PARAMS = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24)
PNG = b"\x89PNG\r\n\x1a\n" + bytes(range(256))


class MemoryBlobs:
    def __init__(self):
        self.items: dict[str, bytes] = {}

    def put(self, blob: bytes) -> tuple[str, str, int]:
        blob_id = uuid.uuid4().hex
        self.items[blob_id] = blob
        return blob_id, hashlib.sha256(blob).hexdigest(), len(blob)

    def get(self, blob_id: str) -> bytes:
        return self.items[blob_id]

    def delete(self, blob_id: str) -> None:
        self.items.pop(blob_id, None)


class WorkerClient:
    def __init__(self, blobs: MemoryBlobs):
        self.blobs, self.uploads, self.completed = blobs, [], []

    def progress(self, *_args, **_kwargs) -> bool:
        return False

    def upload_blob(self, _job_id, sealed):
        self.uploads.append(sealed)
        return "0" * 32

    def complete(self, *args):
        self.completed.append(args)

    def download_blob(self, blob_id):
        return self.blobs.get(blob_id)


class SpyBackend(MockBackend):
    def __init__(self):
        super().__init__()
        self.tasks = []

    def generate(self, task, progress):
        self.tasks.append(task)
        return super().generate(task, progress)


@pytest.fixture
def network(tmp_path):
    blobs, backend = MemoryBlobs(), SpyBackend()
    config = WorkerConfig(gateway_url="http://127.0.0.1:9", profiles=["ltx-2.5-fast"], image_digest=DEV_IMAGE_DIGEST, workdir=tmp_path / "work")
    worker = Worker(config, MockTEE(generate_signing_key(), DEV_IMAGE_DIGEST), {"*": backend})
    worker.client = WorkerClient(blobs)
    worker.evidence = worker.attest(b"\x00" * 32)
    return SimpleNamespace(state=SimpleNamespace(blobs=blobs), worker=worker, backend=backend)


def seal(network, job_id: str, prompt: str, *, seed: int = 11, options: dict | None = None, inputs: list | None = None):
    return standard_jobs.seal_job(
        network.state, job_id=job_id, enclave_id=network.worker.identity.enclave_id,
        hpke_public_key=b64e(network.worker.identity.hpke_public), params=PARAMS, prompt=prompt, negative_prompt=None,
        seed=seed, options=options or {}, inputs=inputs or [],
    )


def test_a_standard_job_is_sealed_padded_and_the_worker_opens_it(network):
    job_id = str(uuid.uuid4())
    sealed = seal(network, job_id, "a lighthouse at dusk", seed=11, options={"camera_motion": "static"})
    aad = job_aad(job_id, network.worker.identity.enclave_id, PARAMS, sealed.blob_ids)
    plaintext = RecipientSession(network.worker.identity.hpke_private, b64d(sealed.enc)).open(b64d(sealed.ciphertext), aad)
    assert payload_version(plaintext) == PAYLOAD_V2 and len(plaintext) == MIN_PADDED

    receipt = network.worker.process(
        MinerJob(job_id=job_id, params=PARAMS, enc=sealed.enc, ciphertext=sealed.ciphertext, input_blob_ids=sealed.blob_ids)
    )
    [task] = network.backend.tasks
    assert (task.prompt, task.seed, task.options) == ("a lighthouse at dusk", 11, {"camera_motion": "static"})
    [output] = network.worker.client.uploads
    assert decrypt_blob(sealed.output_key, output_label(job_id), output)[4:8] == b"ftyp"
    assert receipt.body.output_digest == hashlib.sha256(output).hexdigest()


def test_the_ciphertext_size_does_not_follow_the_prompt_length(network):
    sizes = {len(b64d(seal(network, str(uuid.uuid4()), "a" * n).ciphertext)) for n in (1, 40, 900, 3000)}
    assert sizes == {MIN_PADDED + 16}


def test_a_request_too_large_to_pad_is_refused_and_its_input_blobs_are_discarded(network):
    with pytest.raises(PayloadTooLarge):
        seal(network, str(uuid.uuid4()), "a boat", options={"notes": "x" * MAX_JSON_LEN}, inputs=[({"role": "first_frame", "mime": "image/png"}, PNG)])
    assert network.state.blobs.items == {}
