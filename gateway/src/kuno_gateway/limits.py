"""Request body limits, enforced before a handler reads the body.

Content-Length is checked up front, and the bytes actually received are counted too, so a chunked
upload without a length can't slip past the limit and fill memory.
"""

from __future__ import annotations

import json
from collections.abc import Callable


class _TooLarge(Exception):
    pass


async def _refuse(send) -> None:
    body = json.dumps({"detail": {"code": "too_large", "message": "The request body is larger than this endpoint accepts."}}).encode()
    await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
    await send({"type": "http.response.body", "body": body})


class BodyLimitMiddleware:
    def __init__(self, app, limit_for: Callable[[str], int]):
        self.app = app
        self.limit_for = limit_for

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = self.limit_for(scope["path"])
        declared = dict(scope.get("headers") or []).get(b"content-length")
        if declared is not None and declared.isdigit() and int(declared) > limit:
            await _refuse(send)
            return

        received = 0
        started = False

        async def counted_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise _TooLarge()
            return message

        async def tracked_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, counted_receive, tracked_send)
        except _TooLarge:
            if not started:
                await _refuse(send)
