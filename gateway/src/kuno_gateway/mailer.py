"""Sending sign-in email.

With no email provider configured, messages are written to an outbox directory instead of
being sent: enough for development and tests, and never silently dropped. Configure
KUNO_RESEND_API_KEY and KUNO_EMAIL_FROM to send real email through Resend.
"""

from __future__ import annotations

import json
import logging
import time
import urllib.request
import uuid
from dataclasses import asdict, dataclass
from html import escape
from pathlib import Path
from typing import Protocol

log = logging.getLogger("kuno.mail")


@dataclass(frozen=True)
class Message:
    to: str
    subject: str
    text: str
    html: str


class Mailer(Protocol):
    def send(self, message: Message) -> None: ...


class OutboxMailer:
    """Writes each message to `directory` as JSON. For development and tests."""

    def __init__(self, directory: Path):
        self.directory = directory

    def send(self, message: Message) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self.directory / f"{time.time():.6f}-{uuid.uuid4().hex[:8]}.json"
        path.write_text(json.dumps(asdict(message), indent=2))
        # The address stays out of the log; the outbox file has it.
        log.info("no email provider configured; message written to %s", path)


class ResendMailer:
    endpoint = "https://api.resend.com/emails"

    def __init__(self, api_key: str, sender: str, timeout_s: float = 10.0):
        self.api_key = api_key
        self.sender = sender
        self.timeout_s = timeout_s

    def send(self, message: Message) -> None:
        body = json.dumps(
            {"from": self.sender, "to": [message.to], "subject": message.subject, "text": message.text, "html": message.html}
        ).encode()
        request = urllib.request.Request(
            self.endpoint,
            data=body,
            method="POST",
            headers={"authorization": f"Bearer {self.api_key}", "content-type": "application/json", "user-agent": "kuno-gateway"},
        )
        # urlopen raises on any non-2xx status, so a rejected message is never reported as sent.
        with urllib.request.urlopen(request, timeout=self.timeout_s):
            pass


def sign_in_message(to: str, link: str, valid_minutes: int) -> Message:
    text = (
        "Sign in to KunoWorld\n\n"
        f"Open this link to sign in. It works once and expires in {valid_minutes} minutes:\n\n{link}\n\n"
        "If you didn't ask to sign in, you can ignore this email. Nobody can sign in without the link."
    )
    html = (
        "<p><strong>Sign in to KunoWorld</strong></p>"
        f"<p>Open this link to sign in. It works once and expires in {valid_minutes} minutes:</p>"
        f'<p><a href="{escape(link, quote=True)}">Sign in to KunoWorld</a></p>'
        "<p>If you didn't ask to sign in, you can ignore this email. Nobody can sign in without the link.</p>"
    )
    return Message(to=to, subject="Your KunoWorld sign-in link", text=text, html=html)
