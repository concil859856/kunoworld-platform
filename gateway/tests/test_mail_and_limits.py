"""Sign-in email is never silently dropped, and limits hold without growing forever."""

from __future__ import annotations

import json
import threading

from kuno_gateway.mailer import OutboxMailer, sign_in_message
from kuno_gateway.ratelimit import RateLimiter


def test_without_a_provider_messages_land_in_the_outbox(tmp_path):
    mailer = OutboxMailer(tmp_path / "outbox")
    mailer.send(sign_in_message("ada@example.com", "https://kunoworld.com/auth/verify?token=abc", 15))
    [path] = list((tmp_path / "outbox").iterdir())
    message = json.loads(path.read_text())
    assert message["to"] == "ada@example.com"
    assert "https://kunoworld.com/auth/verify?token=abc" in message["text"]
    assert "expires in 15 minutes" in message["text"]


def test_the_link_is_escaped_in_html():
    message = sign_in_message("a@example.com", 'https://x.test/?t="><script>', 15)
    assert "<script>" not in message.html
    assert "&quot;&gt;&lt;script&gt;" in message.html


def test_a_limit_allows_exactly_that_many_hits_per_window():
    limiter = RateLimiter()
    assert [limiter.allow("k", 3, 60, now=t) for t in (0, 1, 2, 3)] == [True, True, True, False]
    # The window slides: once the first hit is 60 s old, one more is allowed.
    assert limiter.allow("k", 3, 60, now=60.5) is True
    assert limiter.allow("k", 3, 60, now=60.6) is False


def test_refused_attempts_do_not_extend_the_lockout():
    limiter = RateLimiter()
    for t in range(3):
        limiter.allow("k", 3, 10, now=t)
    for t in range(3, 10):
        assert limiter.allow("k", 3, 10, now=t) is False
    assert limiter.allow("k", 3, 10, now=10.5) is True


def test_keys_are_independent_and_pruning_bounds_memory():
    limiter = RateLimiter()
    for i in range(100):
        assert limiter.allow(f"ip:{i}", 1, 60, now=0)
    assert limiter.allow("ip:0", 1, 60, now=1) is False and limiter.allow("ip:new", 1, 60, now=1) is True
    limiter.prune(60, now=120)
    assert len(limiter) == 0


def test_concurrent_hits_never_exceed_the_limit():
    limiter = RateLimiter()
    allowed = []
    lock = threading.Lock()

    def hit():
        ok = limiter.allow("shared", 50, 60)
        with lock:
            allowed.append(ok)

    threads = [threading.Thread(target=hit) for _ in range(400)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert allowed.count(True) == 50
