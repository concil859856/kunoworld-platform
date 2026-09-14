"""Envelope encryption keys for everything the gateway seals at rest (vault.py).

Key hierarchy:

    KEK (key-encryption key)      provider-held: a local key file (dev), AWS KMS, or HashiCorp Vault Transit
     └─ data key (one per object) 32 random bytes, stored only wrapped, in `storage_data_keys`
         └─ content               kuno_protocol.blobs chunked ChaCha20-Poly1305, label-bound

A KEK *version* (`storage_keks.version`) names (provider, key id, provider version). Version 0 is the legacy
`KUNO_STANDARD_STORAGE_KEY`, which encrypted content directly before envelope encryption; those objects keep
decrypting with it.

Rotation (`kuno-gateway rotate-storage-key`) re-wraps data keys under the configured KEK in resumable batches. Content
is never re-encrypted. A KEK version nothing references any more is marked retired. Deleting a data key (`forget`)
makes every copy of that object unreadable, including copies in bucket backups.

Where a data key row is written: into the session a caller passes (`s=`); otherwise into the explicit transaction the
calling thread has open on the gateway's database (`with state.session() as s, s.begin():`), so the key commits or
rolls back with the rows that reference the object; otherwise in a transaction of its own.

Provider APIs used (see deploy/README.md, "Storage keys", for sources):

* AWS KMS: GenerateDataKey (KeySpec AES_256, EncryptionContext), Decrypt (KeyId pinned, same EncryptionContext),
  Encrypt, ReEncrypt (re-wraps inside KMS, the plaintext never leaves it).
* Vault Transit: POST datakey/plaintext/:name, decrypt/:name, encrypt/:name, rewrap/:name, keys/:name/rotate,
  GET keys/:name; X-Vault-Token and X-Vault-Namespace headers.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import threading
import time
from collections import OrderedDict
from contextvars import ContextVar
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from sqlalchemy import delete, event, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, SessionTransactionOrigin

from kuno_protocol.canonical import b64d, b64e

from .db_storage import StorageDataKey, StorageKek

log = logging.getLogger("kuno.gateway.storage_keys")

LEGACY, LOCAL, AWS_KMS, VAULT_TRANSIT = "legacy", "local", "aws-kms", "vault-transit"
PROVIDERS = (LOCAL, AWS_KMS, VAULT_TRANSIT)
REMOTE_PROVIDERS = (AWS_KMS, VAULT_TRANSIT)
ACTIVE, PREVIOUS, RETIRED = "active", "previous", "retired"

LEGACY_DEK_ID = "legacy-v0"
KEYED_HASH_DEK_ID = "keyed-hash"
LEGACY_KEY_FILE = "standard_storage.key"
LOCAL_KEK_FILE = "storage_kek.json"
LOCAL_FORMAT = "kuno-local-kek/1"
CANARY_CONTEXT = {"kuno:purpose": "storage-canary"}


def dek_context(dek_id: str) -> dict[str, str]:
    """Bound into every wrap (KMS EncryptionContext, the local AEAD's associated data)."""
    return {"kuno:purpose": "storage-data-key", "kuno:data-key": dek_id}


def _aad(context: dict[str, str]) -> bytes:
    return json.dumps(context, sort_keys=True, separators=(",", ":")).encode()


# ------------------------------------------------------------------ errors


class StorageKeyError(RuntimeError):
    pass


class StorageKeyMissing(StorageKeyError):
    """Storage keys are not configured (for example a production gateway without a key management service)."""


class LocalKekInProduction(StorageKeyMissing):
    pass


class KekUnavailable(StorageKeyError):
    """The KEK could not be used: the provider is unreachable, refuses, or lacks the key or version."""


class CanaryFailed(StorageKeyError):
    """A KEK no longer unwraps what it wrapped: the key material is not the material this database was used with."""


class DataKeyGone(KeyError):
    """The object's data key was deleted, so the object is gone for good."""


# ------------------------------------------------------------------ providers


class KekProvider:
    provider: str = ""
    key_id: str = ""

    def default_version(self) -> str:
        return ""

    def generate(self, context: dict[str, str], version: str) -> tuple[bytes, bytes]:
        """(plaintext data key, wrapped data key)."""
        dek = secrets.token_bytes(32)
        return dek, self.wrap(dek, context, version)

    def wrap(self, plaintext: bytes, context: dict[str, str], version: str) -> bytes:
        raise NotImplementedError

    def unwrap(self, wrapped: bytes, context: dict[str, str], version: str) -> bytes:
        raise NotImplementedError

    def rewrap(self, wrapped: bytes, context: dict[str, str], source: KekProvider, source_version: str, version: str) -> bytes:
        return self.wrap(source.unwrap(wrapped, context, source_version), context, version)

    def rotate(self) -> str:
        raise StorageKeyError(f"the {self.provider} provider does not rotate key material from here")

    def describe(self) -> str:
        return f"{self.provider} {self.key_id}"


class LocalKekProvider(KekProvider):
    """A JSON key file (mode 0600) holding numbered 32-byte KEK versions. For development, or production only with
    KUNO_STORAGE_KEK_ALLOW_LOCAL=1. Wraps with ChaCha20-Poly1305; the key id, version and context are associated data."""

    provider = LOCAL
    _PREFIX = b"KL1"

    def __init__(self, path: Path):
        self.path = Path(path)
        try:
            data = json.loads(self.path.read_text())
            if data.get("format") != LOCAL_FORMAT:
                raise ValueError("unknown format")
            self.key_id = str(data["key_id"])
            self._versions = {str(v): b64d(k) for v, k in data["versions"].items()}
            self.current = str(data["current"])
        except OSError as exc:
            raise KekUnavailable(f"cannot read the local key file {self.path}: {exc.strerror}") from None
        except (ValueError, KeyError, TypeError):
            raise KekUnavailable(f"{self.path} is not a KunoWorld local key file") from None
        if self.current not in self._versions or any(len(k) != 32 for k in self._versions.values()):
            raise KekUnavailable(f"{self.path} is not a valid KunoWorld local key file")

    @classmethod
    def create(cls, path: Path) -> LocalKekProvider:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        body = {"format": LOCAL_FORMAT, "key_id": secrets.token_hex(8), "current": "1", "versions": {"1": b64e(secrets.token_bytes(32))}}
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            return cls(path)  # another process created it first
        with os.fdopen(fd, "w") as handle:
            json.dump(body, handle)
        return cls(path)

    def default_version(self) -> str:
        return self.current

    def _key(self, version: str) -> bytes:
        try:
            return self._versions[str(version)]
        except KeyError:
            raise KekUnavailable(f"the local key file {self.path} has no version {version}") from None

    def _associated(self, context: dict[str, str], version: str) -> bytes:
        return b"kuno/local-kek/v1|" + self.key_id.encode() + b"|" + str(version).encode() + b"|" + _aad(context)

    def wrap(self, plaintext: bytes, context: dict[str, str], version: str) -> bytes:
        nonce = os.urandom(12)
        return self._PREFIX + nonce + ChaCha20Poly1305(self._key(version)).encrypt(nonce, plaintext, self._associated(context, version))

    def unwrap(self, wrapped: bytes, context: dict[str, str], version: str) -> bytes:
        if not wrapped.startswith(self._PREFIX) or len(wrapped) < len(self._PREFIX) + 12 + 16:
            raise KekUnavailable("not a locally wrapped key")
        nonce, box = wrapped[3:15], wrapped[15:]
        try:
            return ChaCha20Poly1305(self._key(version)).decrypt(nonce, box, self._associated(context, version))
        except InvalidTag:
            raise KekUnavailable(f"local key {self.key_id} v{version} did not unwrap the key (wrong key file?)") from None

    def rotate(self) -> str:
        version = str(max(int(v) for v in self._versions) + 1)
        data = {
            "format": LOCAL_FORMAT, "key_id": self.key_id, "current": version,
            "versions": {**{v: b64e(k) for v, k in self._versions.items()}, version: b64e(secrets.token_bytes(32))},
        }
        tmp = self.path.with_name(f".{self.path.name}.{secrets.token_hex(4)}.tmp")
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as handle:
            json.dump(data, handle)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, self.path)
        self._versions = {v: b64d(k) for v, k in data["versions"].items()}
        self.current = version
        return version


def _aws_error(exc: Exception) -> str:
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        return str(response.get("Error", {}).get("Code") or type(exc).__name__)
    return type(exc).__name__


def region_from_arn(key_id: str) -> str | None:
    parts = key_id.split(":")
    return parts[3] if key_id.startswith("arn:") and len(parts) > 4 and parts[3] else None


class AwsKmsKekProvider(KekProvider):
    """A symmetric AWS KMS key. `key_id` may be a key id, key ARN or alias; after the first GenerateDataKey it is the
    key ARN KMS reports, which is what `storage_keks.key_id` records and what Decrypt pins."""

    provider = AWS_KMS

    def __init__(self, key_id: str, *, region: str | None = None, endpoint_url: str | None = None, client: Any | None = None):
        self.key_id = key_id
        self.region = region or region_from_arn(key_id)
        self.endpoint_url = endpoint_url
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            try:
                import boto3
                from botocore.config import Config
            except ImportError:  # pragma: no cover - depends on the install
                raise KekUnavailable("the aws-kms provider needs boto3: install kuno-gateway[s3]") from None
            kwargs: dict[str, Any] = {"config": Config(retries={"max_attempts": 5, "mode": "standard"})}
            if self.region:
                kwargs["region_name"] = self.region
            if self.endpoint_url:
                kwargs["endpoint_url"] = self.endpoint_url
            self._client = boto3.client("kms", **kwargs)
        return self._client

    def _call(self, operation: str, **kwargs) -> dict:
        method = getattr(self.client, re.sub(r"(?<!^)(?=[A-Z])", "_", operation).lower())
        try:
            return method(**kwargs)
        except Exception as exc:
            raise KekUnavailable(f"AWS KMS {operation} failed ({_aws_error(exc)})") from None

    def generate(self, context: dict[str, str], version: str) -> tuple[bytes, bytes]:
        response = self._call("GenerateDataKey", KeyId=self.key_id, KeySpec="AES_256", EncryptionContext=context)
        if response.get("KeyId"):
            self.key_id = response["KeyId"]  # the key ARN, even when configured with an alias
        return response["Plaintext"], response["CiphertextBlob"]

    def wrap(self, plaintext: bytes, context: dict[str, str], version: str) -> bytes:
        return self._call("Encrypt", KeyId=self.key_id, Plaintext=plaintext, EncryptionContext=context)["CiphertextBlob"]

    def unwrap(self, wrapped: bytes, context: dict[str, str], version: str) -> bytes:
        return self._call("Decrypt", CiphertextBlob=wrapped, KeyId=self.key_id, EncryptionContext=context)["Plaintext"]

    def rewrap(self, wrapped: bytes, context: dict[str, str], source: KekProvider, source_version: str, version: str) -> bytes:
        if isinstance(source, AwsKmsKekProvider) and source.region == self.region and source.endpoint_url == self.endpoint_url:
            return self._call(
                "ReEncrypt", CiphertextBlob=wrapped, SourceKeyId=source.key_id, DestinationKeyId=self.key_id,
                SourceEncryptionContext=context, DestinationEncryptionContext=context,
            )["CiphertextBlob"]
        return super().rewrap(wrapped, context, source, source_version, version)

    def rotate(self) -> str:
        raise StorageKeyError(
            "AWS KMS rotates key material itself (EnableKeyRotation, RotateKeyOnDemand) and keeps old material able to "
            "decrypt, under the same key ARN. To move data keys to another KMS key, point KUNO_STORAGE_KMS_KEY_ID at it "
            "and run rotate-storage-key without --provider-rotate."
        )


_VAULT_VERSION = re.compile(rb"^vault:v(\d+):")


class VaultTransitKekProvider(KekProvider):
    """A HashiCorp Vault Transit key (also OpenBao, whose Transit API is modelled on Vault's). `key_id` is
    "<mount>/<name>"; the provider version is the transit key version, pinned on every wrap."""

    provider = VAULT_TRANSIT

    def __init__(
        self, addr: str, name: str, *, mount: str = "transit", token: str | None = None, token_file: Path | None = None,
        namespace: str | None = None, ca_cert: Path | None = None, client: Any | None = None, timeout: float = 10.0,
    ):
        self.addr, self.name, self.mount = addr.rstrip("/"), name, mount.strip("/")
        self.key_id = f"{self.mount}/{self.name}"
        self._token, self._token_file, self.namespace = token, token_file, namespace
        if client is None:
            import httpx

            client = httpx.Client(timeout=timeout, verify=str(ca_cert) if ca_cert else True)
        self.http = client

    def __repr__(self) -> str:  # never show the token
        return f"VaultTransitKekProvider(addr={self.addr!r}, key_id={self.key_id!r})"

    def _headers(self) -> dict[str, str]:
        token = self._token
        if not token and self._token_file:
            try:
                token = Path(self._token_file).read_text().strip()  # re-read: Vault Agent renews it in place
            except OSError as exc:
                raise KekUnavailable(f"cannot read the Vault token file: {exc.strerror}") from None
        if not token:
            raise KekUnavailable("no Vault token: set KUNO_STORAGE_VAULT_TOKEN or KUNO_STORAGE_VAULT_TOKEN_FILE")
        headers = {"X-Vault-Token": token}
        if self.namespace:
            headers["X-Vault-Namespace"] = self.namespace
        return headers

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        import httpx

        operation = path.split("/")[0]
        try:
            response = self.http.request(method, f"{self.addr}/v1/{self.mount}/{path}", json=body, headers=self._headers())
        except httpx.HTTPError as exc:
            raise KekUnavailable(f"Vault Transit {operation} failed: {type(exc).__name__}") from None
        if response.status_code >= 400:
            try:
                errors = [str(e)[:200] for e in response.json().get("errors") or []]
            except ValueError:
                errors = []
            detail = f": {'; '.join(errors)}" if errors else ""
            raise KekUnavailable(f"Vault Transit {operation} failed: HTTP {response.status_code}{detail}")
        if not response.content:  # e.g. 204 from keys/:name/rotate
            return {}
        try:
            return response.json().get("data") or {}
        except ValueError:
            raise KekUnavailable(f"Vault Transit {operation} returned a body that is not JSON") from None

    @staticmethod
    def ciphertext_version(wrapped: bytes) -> str | None:
        match = _VAULT_VERSION.match(wrapped)
        return match.group(1).decode() if match else None

    def latest_version(self) -> str:
        return str(self._request("GET", f"keys/{self.name}")["latest_version"])

    def default_version(self) -> str:
        return self.latest_version()

    @staticmethod
    def _pin(body: dict, version: str) -> dict:
        if version:
            body["key_version"] = int(version)
        return body

    def generate(self, context: dict[str, str], version: str) -> tuple[bytes, bytes]:
        data = self._request("POST", f"datakey/plaintext/{self.name}", self._pin({"bits": 256}, version))
        return base64.b64decode(data["plaintext"]), data["ciphertext"].encode()

    def wrap(self, plaintext: bytes, context: dict[str, str], version: str) -> bytes:
        body = self._pin({"plaintext": base64.b64encode(plaintext).decode()}, version)
        return self._request("POST", f"encrypt/{self.name}", body)["ciphertext"].encode()

    def unwrap(self, wrapped: bytes, context: dict[str, str], version: str) -> bytes:
        data = self._request("POST", f"decrypt/{self.name}", {"ciphertext": wrapped.decode()})
        return base64.b64decode(data["plaintext"])

    def rewrap(self, wrapped: bytes, context: dict[str, str], source: KekProvider, source_version: str, version: str) -> bytes:
        if isinstance(source, VaultTransitKekProvider) and (source.addr, source.key_id) == (self.addr, self.key_id):
            body = self._pin({"ciphertext": wrapped.decode()}, version)
            return self._request("POST", f"rewrap/{self.name}", body)["ciphertext"].encode()
        return super().rewrap(wrapped, context, source, source_version, version)

    def rotate(self) -> str:
        self._request("POST", f"keys/{self.name}/rotate", {})
        return self.latest_version()


# ------------------------------------------------------------------ configuration


@dataclass
class KekConfig:
    provider: str = LOCAL
    provider_set: bool = False
    allow_local: bool = False
    local_file: Path = Path(LOCAL_KEK_FILE)
    kms_key_id: str | None = None
    kms_region: str | None = None
    kms_endpoint_url: str | None = None
    vault_addr: str | None = None
    vault_token: str | None = field(default=None, repr=False)
    vault_token_file: Path | None = None
    vault_namespace: str | None = None
    vault_mount: str = "transit"
    vault_key: str | None = None
    vault_ca_cert: Path | None = None

    @classmethod
    def from_settings(cls, settings: Any) -> KekConfig:
        raw = (getattr(settings, "storage_kek_provider", None) or "").strip().lower()
        if raw and raw not in PROVIDERS:
            raise StorageKeyError(f"KUNO_STORAGE_KEK_PROVIDER must be one of {', '.join(PROVIDERS)}, not {raw!r}")
        return cls(
            provider=raw or LOCAL,
            provider_set=bool(raw),
            allow_local=bool(getattr(settings, "storage_kek_allow_local", False)),
            local_file=Path(getattr(settings, "storage_local_kek_file", None) or Path(settings.data_dir) / LOCAL_KEK_FILE),
            kms_key_id=getattr(settings, "storage_kms_key_id", None),
            kms_region=getattr(settings, "storage_kms_region", None),
            kms_endpoint_url=getattr(settings, "storage_kms_endpoint_url", None),
            vault_addr=getattr(settings, "storage_vault_addr", None),
            vault_token=getattr(settings, "storage_vault_token", None),
            vault_token_file=getattr(settings, "storage_vault_token_file", None),
            vault_namespace=getattr(settings, "storage_vault_namespace", None),
            vault_mount=getattr(settings, "storage_vault_mount", None) or "transit",
            vault_key=getattr(settings, "storage_vault_key", None),
            vault_ca_cert=getattr(settings, "storage_vault_ca_cert", None),
        )


def require_production_provider(config: KekConfig, production: bool) -> None:
    """Production wraps data keys with a key management service; a local key file needs an explicit override."""
    if not production or config.provider in REMOTE_PROVIDERS:
        return
    if config.allow_local:
        log.warning("production gateway using a local storage key file (KUNO_STORAGE_KEK_ALLOW_LOCAL=1): back it up separately")
        return
    raise LocalKekInProduction(
        "A production gateway wraps storage data keys with a key management service: set KUNO_STORAGE_KEK_PROVIDER to "
        "aws-kms (with KUNO_STORAGE_KMS_KEY_ID) or vault-transit (with KUNO_STORAGE_VAULT_ADDR, KUNO_STORAGE_VAULT_KEY "
        "and a token). KUNO_STORAGE_KEK_ALLOW_LOCAL=1 accepts a local key file instead (deploy/README.md, \"Storage keys\")."
    )


class Providers:
    """Builds and caches one provider per (provider, key id): the configured KEK, and older versions' KEKs for
    unwrapping and re-wrapping."""

    def __init__(self, config: KekConfig, *, kms_client: Any | None = None, vault_client: Any | None = None):
        self.config = config
        self.kms_client, self.vault_client = kms_client, vault_client
        self._cache: dict[tuple[str, str], KekProvider] = {}
        self._lock = threading.Lock()

    def configured(self, *, create_local: bool) -> KekProvider:
        c = self.config
        if c.provider == LOCAL:
            if not c.local_file.exists():
                if not create_local:
                    raise StorageKeyMissing(f"the local storage key file {c.local_file} does not exist")
                provider: KekProvider = LocalKekProvider.create(c.local_file)
            else:
                provider = LocalKekProvider(c.local_file)
        elif c.provider == AWS_KMS:
            if not c.kms_key_id:
                raise StorageKeyMissing("KUNO_STORAGE_KEK_PROVIDER=aws-kms needs KUNO_STORAGE_KMS_KEY_ID")
            provider = AwsKmsKekProvider(c.kms_key_id, region=c.kms_region, endpoint_url=c.kms_endpoint_url, client=self.kms_client)
        else:
            if not (c.vault_addr and c.vault_key):
                raise StorageKeyMissing("KUNO_STORAGE_KEK_PROVIDER=vault-transit needs KUNO_STORAGE_VAULT_ADDR and KUNO_STORAGE_VAULT_KEY")
            provider = self._vault(c.vault_mount, c.vault_key)
        return provider

    def remember(self, provider: KekProvider) -> None:
        with self._lock:
            self._cache[(provider.provider, provider.key_id)] = provider

    def _vault(self, mount: str, name: str) -> VaultTransitKekProvider:
        c = self.config
        if not c.vault_addr:
            raise KekUnavailable("KUNO_STORAGE_VAULT_ADDR is not set")
        return VaultTransitKekProvider(
            c.vault_addr, name, mount=mount, token=c.vault_token, token_file=c.vault_token_file,
            namespace=c.vault_namespace, ca_cert=c.vault_ca_cert, client=self.vault_client,
        )

    def for_kek(self, kek: StorageKek) -> KekProvider:
        key = (kek.provider, kek.key_id)
        with self._lock:
            cached = self._cache.get(key)
        if cached is not None:
            return cached
        if kek.provider == LOCAL:
            provider: KekProvider = LocalKekProvider(self.config.local_file)
            if provider.key_id != kek.key_id:
                raise KekUnavailable(f"the local key file holds key {provider.key_id}, not {kek.key_id} (KEK v{kek.version})")
        elif kek.provider == AWS_KMS:
            provider = AwsKmsKekProvider(
                kek.key_id, region=region_from_arn(kek.key_id) or self.config.kms_region,
                endpoint_url=self.config.kms_endpoint_url, client=self.kms_client,
            )
        elif kek.provider == VAULT_TRANSIT:
            mount, _, name = kek.key_id.rpartition("/")
            provider = self._vault(mount, name)
        else:
            raise KekUnavailable(f"KEK v{kek.version} has provider {kek.provider!r}, which wraps nothing")
        self.remember(provider)
        return provider


# ------------------------------------------------------------------ the transaction a data key joins

_ambient: ContextVar[tuple] = ContextVar("kuno_storage_ambient_sessions", default=())


def _track_explicit_transactions(session_factory: Any) -> None:
    """Remembers, per thread and task, the sessions inside `with s.begin():`, so a data key sealed there commits or
    rolls back with the caller's rows."""
    if getattr(session_factory, "_kuno_storage_tracking", False):
        return

    def created(session, transaction) -> None:
        if transaction.parent is None and transaction.origin is SessionTransactionOrigin.BEGIN:
            _ambient.set(_ambient.get() + ((session, threading.get_ident()),))

    def ended(session, transaction) -> None:
        if transaction.parent is None:
            stack = _ambient.get()
            if any(entry[0] is session for entry in stack):
                _ambient.set(tuple(entry for entry in stack if entry[0] is not session))

    event.listen(session_factory, "after_transaction_create", created)
    event.listen(session_factory, "after_transaction_end", ended)
    session_factory._kuno_storage_tracking = True


@dataclass(frozen=True)
class ActiveKek:
    version: int
    provider: KekProvider
    provider_version: str


@dataclass
class _KekInfo:
    version: int
    provider: str
    key_id: str
    provider_version: str
    status: str


class StorageKeyring:
    """Data keys for one gateway database. `ctx` needs `settings`, `session()` and optionally `engine`, `Session`,
    `postgres` and `policy` (a GatewayState has them all)."""

    def __init__(
        self, ctx: Any, config: KekConfig | None = None, providers: Providers | None = None, *, production: bool | None = None,
        cache_size: int = 4096, cache_ttl_s: float = 600.0,
    ):
        self.ctx = ctx
        self.settings = ctx.settings
        self.config = config or KekConfig.from_settings(ctx.settings)
        self.providers = providers or Providers(self.config)
        self.production = is_production(ctx) if production is None else production
        self.cache_size, self.cache_ttl_s = cache_size, cache_ttl_s
        self._lock = threading.RLock()
        self._cache: OrderedDict[str, tuple[bytes, str | None, float]] = OrderedDict()
        self._keks: dict[int, _KekInfo] = {}
        self._active: ActiveKek | None = None
        self._hash_key: bytes | None = None
        self.report: dict = {}
        factory = getattr(ctx, "Session", None)
        if factory is not None:
            _track_explicit_transactions(factory)

    # ------------------------------------------------------------ sessions

    def _ambient_session(self) -> Session | None:
        me = threading.get_ident()
        engine = getattr(self.ctx, "engine", None)
        for session, owner in reversed(_ambient.get()):
            if owner != me:
                continue
            transaction = session.get_transaction()
            if transaction is None or not transaction.is_active:
                continue
            if engine is not None and session.get_bind() is not engine:
                continue
            return session
        return None

    def _write(self, s: Session | None, fn) -> Any:
        target = s if s is not None else self._ambient_session()
        if target is not None:
            return fn(target)
        with self.ctx.session() as own, own.begin():
            return fn(own)

    def _read(self, s: Session | None, fn) -> Any:
        target = s if s is not None else self._ambient_session()
        if target is not None:
            return fn(target)
        with self.ctx.session() as own:
            return fn(own)

    # ------------------------------------------------------------ cache

    def _cache_put(self, dek_id: str, dek: bytes, label: str | None) -> None:
        with self._lock:
            self._cache[dek_id] = (dek, label, time.monotonic() + self.cache_ttl_s)
            self._cache.move_to_end(dek_id)
            while len(self._cache) > self.cache_size:
                self._cache.popitem(last=False)

    def _cache_get(self, dek_id: str) -> bytes | None:
        with self._lock:
            hit = self._cache.get(dek_id)
            if hit is None:
                return None
            if hit[2] < time.monotonic():
                del self._cache[dek_id]
                return None
            self._cache.move_to_end(dek_id)
            return hit[0]

    def _evict(self, labels: set[str] | None = None, dek_ids: set[str] | None = None) -> None:
        with self._lock:
            for dek_id in [k for k, (_, label, _) in self._cache.items() if (labels and label in labels) or (dek_ids and k in dek_ids)]:
                del self._cache[dek_id]

    # ------------------------------------------------------------ KEK versions

    def _kek(self, version: int, s: Session | None = None) -> _KekInfo:
        cached = self._keks.get(version)
        if cached is not None:
            return cached
        row = self._read(s, lambda session: session.get(StorageKek, version))
        if row is None:
            raise KekUnavailable(f"no KEK version {version} is registered")
        info = _KekInfo(row.version, row.provider, row.key_id, row.provider_version, row.status)
        if info.status != ACTIVE:
            self._keks[version] = info
        return info

    def _provider_for(self, info: _KekInfo) -> KekProvider:
        active = self._active
        if active is not None and (info.provider, info.key_id) == (active.provider.provider, active.provider.key_id):
            return active.provider
        row = StorageKek(version=info.version, provider=info.provider, key_id=info.key_id, provider_version=info.provider_version)
        return self.providers.for_kek(row)

    def _local_keys_in_use(self) -> int:
        with self.ctx.session() as s:
            return s.scalar(
                select(func.count()).select_from(StorageDataKey).join(StorageKek, StorageKek.version == StorageDataKey.kek_version)
                .where(StorageKek.provider == LOCAL)
            ) or 0

    def activate(self, provider: KekProvider, provider_version: str) -> ActiveKek:
        """Registers (provider, key id, version) as a KEK version if it is new, checks its canary, and makes it the
        version new data keys are wrapped with."""
        for _ in range(3):
            try:
                with self.ctx.session() as s, s.begin():
                    now = time.time()
                    row = s.scalars(
                        select(StorageKek).where(
                            StorageKek.provider == provider.provider, StorageKek.key_id == provider.key_id,
                            StorageKek.provider_version == provider_version,
                        )
                    ).first()
                    if row is None:
                        canary = secrets.token_bytes(32)
                        wrapped = provider.wrap(canary, CANARY_CONTEXT, provider_version)
                        highest = s.scalar(select(func.max(StorageKek.version))) or 0
                        row = StorageKek(
                            version=max(highest, 0) + 1, provider=provider.provider, key_id=provider.key_id,
                            provider_version=provider_version, status=ACTIVE, canary=b64e(wrapped),
                            canary_digest=hashlib.sha256(canary).hexdigest(), created_at=now, activated_at=now,
                        )
                        s.add(row)
                        s.flush()
                        log.info("registered storage KEK v%s (%s)", row.version, provider.describe())
                    else:
                        self._check_canary(provider, row)
                        if row.status != ACTIVE:
                            row.status, row.activated_at, row.retired_at = ACTIVE, now, None
                    s.execute(
                        update(StorageKek).where(StorageKek.status == ACTIVE, StorageKek.version != row.version).values(status=PREVIOUS)
                    )
                    active = ActiveKek(row.version, provider, provider_version)
            except IntegrityError:
                continue  # another process registered the same version first
            with self._lock:
                self._active = active
                self._keks = {v: k for v, k in self._keks.items() if v != active.version}
            self.providers.remember(provider)
            return active
        raise KekUnavailable("could not register the storage KEK")

    @staticmethod
    def _check_canary(provider: KekProvider, row: StorageKek) -> None:
        if not row.canary or not row.canary_digest:
            return
        try:
            value = provider.unwrap(b64d(row.canary), CANARY_CONTEXT, row.provider_version)
        except KekUnavailable as exc:
            raise CanaryFailed(f"storage KEK v{row.version} ({row.provider} {row.key_id}) does not unwrap its canary: {exc}") from None
        if not hmac.compare_digest(hashlib.sha256(value).hexdigest(), row.canary_digest):
            raise CanaryFailed(f"storage KEK v{row.version} ({row.provider} {row.key_id}) unwrapped a different canary")

    # ------------------------------------------------------------ start-up

    def check(self) -> dict:
        """The start-up check. Refuses production without a key management service (unless overridden), proves the
        configured KEK can wrap and unwrap, registers it, checks its stored canary, checks the legacy key, and makes
        sure the keyed-hash key exists. Older KEK versions that fail are reported, not fatal."""
        with self._lock:
            require_production_provider(self.config, self.production)
            if self.config.provider == LOCAL and not self.config.local_file.exists() and not self.production:
                in_use = self._local_keys_in_use()
                if in_use:
                    raise CanaryFailed(
                        f"the local storage key file {self.config.local_file} is missing, but {in_use} data keys are wrapped "
                        "with a local key: restore the file instead of letting the gateway create a new one"
                    )
            provider = self.providers.configured(create_local=not self.production)
            version = provider.default_version()
            if self.config.provider == VAULT_TRANSIT:
                version = self._registered_vault_version(provider) or version
            dek, wrapped = provider.generate(CANARY_CONTEXT, version)
            if not hmac.compare_digest(provider.unwrap(wrapped, CANARY_CONTEXT, version), dek):
                raise CanaryFailed(f"{provider.describe()} did not return the key it wrapped")
            active = self.activate(provider, version)
            report: dict = {
                "active_version": active.version, "provider": provider.provider, "key_id": provider.key_id,
                "provider_version": version, "unavailable_versions": [],
            }
            if isinstance(provider, VaultTransitKekProvider):
                latest = provider.latest_version()
                if latest != version:
                    report["hint"] = f"Vault key {provider.key_id} is at version {latest}; run rotate-storage-key to adopt it"
            with self.ctx.session() as s:
                others = s.scalars(select(StorageKek).where(StorageKek.status == PREVIOUS, StorageKek.version != 0)).all()
            for row in others:
                try:
                    self._check_canary(self.providers.for_kek(row), row)
                except StorageKeyError as exc:
                    log.error("storage KEK v%s is not usable: %s", row.version, exc)
                    report["unavailable_versions"].append(row.version)
            report["legacy"] = self._check_legacy()
            self.keyed_hash_key()
            self.report = report
            return report

    def _registered_vault_version(self, provider: KekProvider) -> str | None:
        with self.ctx.session() as s:
            versions = s.scalars(
                select(StorageKek.provider_version).where(StorageKek.provider == VAULT_TRANSIT, StorageKek.key_id == provider.key_id)
            ).all()
        numbers = [int(v) for v in versions if v.isdigit()]
        return str(max(numbers)) if numbers else None

    def active(self) -> ActiveKek:
        if self._active is None:
            self.check()
        return self._active

    # ------------------------------------------------------------ legacy key (KEK v0)

    def configured_legacy_key(self) -> bytes | None:
        """KUNO_STANDARD_STORAGE_KEY, or a dev data directory's generated standard_storage.key. Never created any more."""
        raw = getattr(self.settings, "standard_storage_key", None)
        if not raw:
            path = Path(self.settings.data_dir) / LEGACY_KEY_FILE
            if not path.exists():
                return None
            raw = path.read_text().strip()
        try:
            key = b64d(raw)
        except ValueError:
            key = b""
        if len(key) != 32:
            raise StorageKeyError("KUNO_STANDARD_STORAGE_KEY must be base64url of 32 bytes")
        return key

    @staticmethod
    def legacy_fingerprint(key: bytes) -> str:
        return hmac.new(key, b"kuno/storage/legacy-fingerprint", hashlib.sha256).hexdigest()

    def legacy_key(self, s: Session | None = None) -> bytes | None:
        configured = self.configured_legacy_key()
        if configured is not None:
            return configured
        try:
            return self.data_key(LEGACY_DEK_ID, s)
        except DataKeyGone:
            return None

    def _check_legacy(self) -> str:
        configured = self.configured_legacy_key()
        with self.ctx.session() as s, s.begin():
            v0 = s.get(StorageKek, 0)
            imported = s.get(StorageDataKey, LEGACY_DEK_ID)
            if configured is None:
                return "imported" if imported is not None else "none"
            fingerprint = self.legacy_fingerprint(configured)
            if v0 is None:
                now = time.time()
                s.add(StorageKek(
                    version=0, provider=LEGACY, key_id="KUNO_STANDARD_STORAGE_KEY", provider_version="",
                    status=RETIRED if imported is not None else PREVIOUS, canary=None, canary_digest=fingerprint,
                    created_at=now, retired_at=now if imported is not None else None,
                ))
            elif v0.canary_digest and not hmac.compare_digest(v0.canary_digest, fingerprint):
                raise CanaryFailed("KUNO_STANDARD_STORAGE_KEY is not the legacy storage key this database was used with")
        if imported is not None:
            if not hmac.compare_digest(self.data_key(LEGACY_DEK_ID), configured):
                raise CanaryFailed("KUNO_STANDARD_STORAGE_KEY differs from the legacy key imported into the database")
            return "imported"
        return "configured"

    def import_legacy(self, s: Session) -> bool:
        """Wraps the legacy key as a data key under the active KEK, so legacy objects keep decrypting without
        KUNO_STANDARD_STORAGE_KEY in the environment. Marks KEK v0 retired."""
        configured = self.configured_legacy_key()
        if configured is None or s.get(StorageDataKey, LEGACY_DEK_ID) is not None:
            return False
        active = self.active()
        now = time.time()
        wrapped = active.provider.wrap(configured, dek_context(LEGACY_DEK_ID), active.provider_version)
        s.add(StorageDataKey(id=LEGACY_DEK_ID, kek_version=active.version, wrapped_key=b64e(wrapped), label=None, created_at=now))
        v0 = s.get(StorageKek, 0)
        if v0 is None:
            v0 = StorageKek(version=0, provider=LEGACY, key_id="KUNO_STANDARD_STORAGE_KEY", provider_version="", status=PREVIOUS,
                            canary_digest=self.legacy_fingerprint(configured), created_at=now)
            s.add(v0)
        v0.status, v0.retired_at = RETIRED, now
        return True

    # ------------------------------------------------------------ data keys

    def keyed_hash_key(self) -> bytes:
        """The HMAC key for stable pseudonyms. Derived from the legacy key when there is one (so existing pseudonyms stay
        stable), random otherwise; either way stored wrapped, so it survives removing the legacy key."""
        if self._hash_key is not None:
            return self._hash_key
        with self._lock:
            if self._hash_key is not None:
                return self._hash_key
            try:
                value = self.data_key(KEYED_HASH_DEK_ID)
            except DataKeyGone:
                legacy = self.legacy_key()
                value = hmac.new(legacy, b"kuno/at-rest/keyed-hash", hashlib.sha256).digest() if legacy else secrets.token_bytes(32)
                active = self.active()
                wrapped = active.provider.wrap(value, dek_context(KEYED_HASH_DEK_ID), active.provider_version)
                try:
                    with self.ctx.session() as s, s.begin():  # its own transaction: it must never roll back with a caller
                        s.add(StorageDataKey(id=KEYED_HASH_DEK_ID, kek_version=active.version, wrapped_key=b64e(wrapped),
                                             label=None, created_at=time.time()))
                except IntegrityError:
                    value = self.data_key(KEYED_HASH_DEK_ID)
            self._hash_key = value
            return value

    def new_data_key(self, label: str | None, s: Session | None = None) -> tuple[str, bytes]:
        active = self.active()
        dek_id = secrets.token_hex(16)
        dek, wrapped = active.provider.generate(dek_context(dek_id), active.provider_version)
        if len(dek) != 32:
            raise KekUnavailable("the KEK provider returned a data key that is not 32 bytes")
        row = StorageDataKey(
            id=dek_id, kek_version=active.version, wrapped_key=b64e(wrapped), label=label[:200] if label else None,
            created_at=time.time(),
        )
        self._write(s, lambda session: session.add(row))
        self._cache_put(dek_id, dek, row.label)
        return dek_id, dek

    def data_key(self, dek_id: str, s: Session | None = None) -> bytes:
        cached = self._cache_get(dek_id)
        if cached is not None:
            return cached
        found = self._read(s, lambda session: _row_values(session.get(StorageDataKey, dek_id)))
        if found is None:
            raise DataKeyGone(dek_id)
        kek_version, wrapped, label = found
        info = self._kek(kek_version, s)
        dek = self._provider_for(info).unwrap(b64d(wrapped), dek_context(dek_id), info.provider_version)
        if info.status == RETIRED:
            log.warning("data key %s is wrapped by retired KEK v%s", dek_id, info.version)
        self._cache_put(dek_id, dek, label)
        return dek

    def forget(self, s: Session, labels) -> list[str]:
        """Deletes the data keys of these labels, in the caller's transaction, and returns the labels that had any.
        Every copy of those objects, including copies in bucket backups, becomes unreadable once this commits."""
        wanted = sorted({label[:200] for label in labels if label})
        if not wanted:
            return []
        present = sorted(set(s.scalars(select(StorageDataKey.label).where(StorageDataKey.label.in_(wanted))).all()))
        if present:
            s.execute(delete(StorageDataKey).where(StorageDataKey.label.in_(present)).execution_options(synchronize_session=False))
        self._evict(labels=set(wanted))
        return present

    def retire_unreferenced(self) -> list[int]:
        retired = []
        with self.ctx.session() as s, s.begin():
            now = time.time()
            for kek in s.scalars(select(StorageKek).where(StorageKek.status == PREVIOUS).order_by(StorageKek.version)).all():
                if kek.version == 0:
                    in_use = s.get(StorageDataKey, LEGACY_DEK_ID) is None
                else:
                    in_use = bool(s.scalar(select(func.count()).select_from(StorageDataKey).where(StorageDataKey.kek_version == kek.version)))
                if not in_use:
                    kek.status, kek.retired_at = RETIRED, now
                    retired.append(kek.version)
        with self._lock:
            self._keks = {}
        return retired


def _row_values(row: StorageDataKey | None):
    return None if row is None else (row.kek_version, row.wrapped_key, row.label)


def is_production(ctx: Any) -> bool:
    settings = getattr(ctx, "settings", None)
    policy = getattr(ctx, "policy", None)
    return bool(getattr(settings, "production", False) or getattr(policy, "production", False))


_KEYRING_LOCK = threading.Lock()


def keyring_for(state: Any) -> StorageKeyring:
    cached = getattr(state, "_kuno_keyring", None)
    if cached is not None:
        return cached
    with _KEYRING_LOCK:
        cached = getattr(state, "_kuno_keyring", None)
        if cached is None:
            cached = StorageKeyring(state)
            state._kuno_keyring = cached
    return cached


# ------------------------------------------------------------------ rotation


@dataclass
class RotationReport:
    target_version: int
    provider: str
    key_id: str
    provider_version: str
    dry_run: bool = False
    provider_rotated: bool = False
    legacy_imported: bool = False
    rewrapped: int = 0
    failed: list[str] = field(default_factory=list)
    remaining: int = 0
    by_version: dict[int, int] = field(default_factory=dict)
    retired: list[int] = field(default_factory=list)
    batches: int = 0

    def lines(self) -> list[str]:
        version = f" version {self.provider_version}" if self.provider_version else ""
        out = [f"target KEK v{self.target_version}: {self.provider} {self.key_id}{version}"]
        if self.provider_rotated:
            out.append("  provider key material rotated")
        out.append("  data keys by KEK version: " + (", ".join(f"v{v}={n}" for v, n in sorted(self.by_version.items())) or "none"))
        if self.dry_run:
            out.append(f"  dry run: {self.remaining} data keys would be re-wrapped")
            return out
        if self.legacy_imported:
            out.append("  legacy KUNO_STANDARD_STORAGE_KEY imported as a wrapped data key; KEK v0 retired")
        out.append(f"  re-wrapped {self.rewrapped} in {self.batches} batches; {self.remaining} still on other versions")
        if self.failed:
            out.append(f"  {len(self.failed)} could not be re-wrapped (their KEK is unavailable); run again once it is")
        if self.retired:
            out.append("  retired KEK versions: " + ", ".join(f"v{v}" for v in self.retired))
            out.append(
                "  keep retired key material (key file versions, KMS keys, Vault key versions) until every database backup "
                "taken before today has expired: a restore brings back data keys wrapped with it"
            )
        return out


def _counts(ctx: Any) -> dict[int, int]:
    with ctx.session() as s:
        return {v: n for v, n in s.execute(select(StorageDataKey.kek_version, func.count()).group_by(StorageDataKey.kek_version)).all()}


def rotate(
    ctx: Any, *, keyring: StorageKeyring | None = None, provider_rotate: bool = False, batch_size: int = 500,
    max_batches: int | None = None, dry_run: bool = False, retire: bool = True,
) -> RotationReport:
    """Re-wraps every data key under the configured KEK. Safe to interrupt and run again: each batch commits, and
    a run picks up whatever is still on another version. With `provider_rotate`, first asks the provider for new key
    material (local key file, Vault Transit) and makes that version the target."""
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")
    keyring = keyring or keyring_for(ctx)
    keyring.check()
    active = keyring.active()
    if provider_rotate and not dry_run:
        new_version = active.provider.rotate()
        active = keyring.activate(active.provider, new_version)
    report = RotationReport(active.version, active.provider.provider, active.provider.key_id, active.provider_version,
                            dry_run=dry_run, provider_rotated=provider_rotate and not dry_run)
    report.by_version = _counts(ctx)
    if dry_run:
        report.remaining = sum(n for v, n in report.by_version.items() if v != active.version)
        return report
    with ctx.session() as s, s.begin():
        report.legacy_imported = keyring.import_legacy(s)
    postgres = bool(getattr(ctx, "postgres", False))
    last_id = ""
    while max_batches is None or report.batches < max_batches:
        with ctx.session() as s, s.begin():
            query = (
                select(StorageDataKey)
                .where(StorageDataKey.kek_version != active.version, StorageDataKey.id > last_id)
                .order_by(StorageDataKey.id)
                .limit(batch_size)
            )
            if postgres:
                query = query.with_for_update(skip_locked=True)
            rows = s.scalars(query).all()
            if not rows:
                break
            now = time.time()
            for row in rows:
                last_id = row.id
                try:
                    info = keyring._kek(row.kek_version, s)
                    source = keyring._provider_for(info)
                    wrapped = active.provider.rewrap(
                        b64d(row.wrapped_key), dek_context(row.id), source, info.provider_version, active.provider_version
                    )
                except StorageKeyError as exc:
                    log.error("could not re-wrap data key %s from KEK v%s: %s", row.id, row.kek_version, exc)
                    report.failed.append(row.id)
                    continue
                row.wrapped_key, row.kek_version, row.rewrapped_at = b64e(wrapped), active.version, now
                report.rewrapped += 1
        report.batches += 1
    counts = _counts(ctx)
    report.remaining = sum(n for v, n in counts.items() if v != active.version)
    if retire:
        report.retired = keyring.retire_unreferenced()
    report.by_version = _counts(ctx)
    return report
