"""Test helpers for plan jobs (PROTOCOL.md "Plans (Director)"): a plan written the way a worker writes one (a planner reply
repaired and fitted by kuno_protocol.plans), sealed to the job's output key, and the receipt that certifies it."""

from __future__ import annotations

import json
import time

from kuno_protocol import devkit
from kuno_protocol.canonical import canonical_json, sha256_hex
from kuno_protocol.plans import Plan, PlanOptions, plan_context, repair, seal_plan, suggested_shots
from kuno_protocol.profiles import Mode, load_profiles
from kuno_protocol.receipts import PlanInfo, ReceiptBody, sign_receipt
from kuno_protocol.schemas import GenerationParams

FAST = load_profiles()["ltx-2.5-fast"]
PLANNER = "ltx-2.5-distilled/bf16/1:prompt_enhancer"


def plan_params(target_s: float = 30, resolution: str = "720p", aspect_ratio: str = "16:9", fps: int = 24) -> GenerationParams:
    return GenerationParams(profile_id=FAST.id, mode=Mode.PLAN, duration_s=target_s, resolution=resolution, aspect_ratio=aspect_ratio, fps=fps)


def write_plan(params: GenerationParams, brief: str, options: PlanOptions | None = None, prompt: str | None = None) -> Plan:
    """A plan for these params: the suggested shots, each prompt naming the brief (or `prompt`), repaired and fitted."""
    context = plan_context(FAST, params, options)
    count, length = suggested_shots(context)
    text = prompt or f"Wide shot; {brief}. The camera slowly pushes in."
    shots = [{"beat": f"Beat {i + 1}", "prompt": text, "duration_s": length, "join": "fresh" if i == 0 else "cut"} for i in range(count)]
    reply = json.dumps({"title": "A plan", "scene": "A quiet harbor town at dawn.", "shots": shots, "notes": ""})
    return repair(reply, context, planner=PLANNER, brief=brief).deliverable()


def sealed_plan(output_key: bytes, job_id: str, plan: Plan) -> tuple[bytes, bytes]:
    return seal_plan(output_key, job_id, plan)


def plan_receipt(signing_key, *, job_id: str, enclave_id: str, params: GenerationParams, plan: Plan, plan_json: bytes, sealed: bytes,
                 content_digest: str | None = None, gpu_seconds: float = 12.0):
    now = time.time()
    body = ReceiptBody(
        job_id=job_id, enclave_id=enclave_id, profile_id=params.profile_id, image_digest=devkit.DEV_IMAGE_DIGEST,
        params_digest=sha256_hex(canonical_json(params.model_dump(mode="json"))), input_digest="0" * 64,
        output_digest=sha256_hex(sealed), output_bytes=len(sealed), content_digest=content_digest or sha256_hex(plan_json),
        attestation_digest="0" * 64, started_at=now - gpu_seconds, finished_at=now, gpu_seconds=gpu_seconds,
        plan=PlanInfo(shots=len(plan.shots), duration_s=plan.duration_s, planner=plan.planner.model,
                      prompt_version=plan.planner.prompt_version, output_tokens=420),
    )
    return sign_receipt(signing_key, body)
