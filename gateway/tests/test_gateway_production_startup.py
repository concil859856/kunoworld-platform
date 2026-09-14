"""What a production gateway refuses to start without: a key management service for storage keys (unless the local key
file override is set, and then only with a file that already exists), and, when it runs a C2PA CA, a timestamp
authority. Runs against moto's S3 and KMS."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

boto3 = pytest.importorskip("boto3")
moto = pytest.importorskip("moto")

from fastapi.testclient import TestClient  # noqa: E402

from kuno_gateway.app import create_app  # noqa: E402
from kuno_gateway.settings import Settings  # noqa: E402
from kuno_gateway.storage_keys import LocalKekInProduction, LocalKekProvider, StorageKeyError, StorageKeyMissing  # noqa: E402
from kuno_gateway.tsa import TimestampAuthorityRequired  # noqa: E402
from kuno_protocol import devkit  # noqa: E402

BUCKET = "kuno-production-startup"
TSA = "http://ts-c2pa.example/ecc"


@pytest.fixture
def aws(monkeypatch, tmp_path):
    for key, value in {
        "AWS_ACCESS_KEY_ID": "testing", "AWS_SECRET_ACCESS_KEY": "testing", "AWS_SESSION_TOKEN": "testing",
        "AWS_DEFAULT_REGION": "us-east-1", "KUNO_S3_BUCKET": BUCKET, "KUNO_S3_REGION": "us-east-1",
    }.items():
        monkeypatch.setenv(key, value)
    with moto.mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=BUCKET)
        key = boto3.client("kms", region_name="us-east-1").create_key(Description="kuno storage")["KeyMetadata"]
        data = tmp_path / "data"
        devkit.init(data)
        yield SimpleNamespace(key_arn=key["Arn"], data=data)


def production(aws, **env) -> Settings:
    settings = Settings.from_env({"KUNO_DATA_DIR": str(aws.data), "KUNO_ENV": "production", "KUNO_BLOB_BACKEND": "s3", **env})
    assert settings.production and settings.c2pa_ca_key is not None, "devkit init configures the C2PA CA in dev.env"
    return settings


def kms(aws) -> dict:
    return {"KUNO_STORAGE_KEK_PROVIDER": "aws-kms", "KUNO_STORAGE_KMS_KEY_ID": aws.key_arn, "KUNO_STORAGE_KMS_REGION": "us-east-1"}


def test_production_refuses_a_local_storage_key_file(aws):
    with pytest.raises(LocalKekInProduction, match="KUNO_STORAGE_KEK_PROVIDER"):
        create_app(production(aws, KUNO_C2PA_TSA_URL=TSA))
    with pytest.raises(LocalKekInProduction):
        create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, KUNO_STORAGE_KEK_PROVIDER="local"))
    assert not (aws.data / "storage_kek.json").exists()


def test_the_documented_local_override_needs_a_key_file_that_already_exists(aws):
    settings = production(aws, KUNO_C2PA_TSA_URL=TSA, KUNO_STORAGE_KEK_ALLOW_LOCAL="1")
    with pytest.raises(StorageKeyMissing, match="does not exist") as caught:
        create_app(settings)
    assert not isinstance(caught.value, LocalKekInProduction)
    assert not (aws.data / "storage_kek.json").exists()  # production never generates one

    LocalKekProvider.create(aws.data / "storage_kek.json")
    app = create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, KUNO_STORAGE_KEK_ALLOW_LOCAL="1"))
    assert app.state.startup_report["storage_keys"]["provider"] == "local"


def test_production_starts_with_aws_kms_and_a_timestamp_authority(aws):
    app = create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, **kms(aws)))
    report = app.state.startup_report["storage_keys"]
    assert (report["provider"], report["key_id"], report["active_version"]) == ("aws-kms", aws.key_arn, 1)
    assert app.state.c2pa_ca is not None and app.state.c2pa_ca.tsa_url == TSA
    assert app.state.startup_report["tsa_probe"] is None  # the probe is opt-in
    assert TestClient(app).get("/healthz").json()["ok"] is True


def test_production_starts_with_a_list_of_timestamp_authorities(aws):
    backup = "http://backup-tsa.example/tsr"
    app = create_app(production(aws, KUNO_C2PA_TSA_URLS=f"{TSA}, {backup}", **kms(aws)))
    assert (app.state.c2pa_ca.tsa_url, app.state.c2pa_ca.tsa_urls) == (TSA, [TSA, backup])


def test_production_with_a_c2pa_ca_refuses_to_start_without_a_timestamp_authority(aws):
    with pytest.raises(TimestampAuthorityRequired, match="KUNO_C2PA_TSA_URL"):
        create_app(production(aws, **kms(aws)))


def test_a_dev_gateway_needs_neither(tmp_path):
    data = tmp_path / "data"
    devkit.init(data)
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)}))
    assert app.state.c2pa_ca is not None and app.state.c2pa_ca.tsa_url is None
    assert app.state.startup_report["storage_keys"]["provider"] == "local"
    assert (data / "storage_kek.json").exists()


def test_a_misconfigured_key_management_service_stops_start_up(aws):
    with pytest.raises(StorageKeyMissing, match="KUNO_STORAGE_VAULT_ADDR"):
        create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, KUNO_STORAGE_KEK_PROVIDER="vault-transit"))
    with pytest.raises(StorageKeyMissing, match="KUNO_STORAGE_KMS_KEY_ID"):
        create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, KUNO_STORAGE_KEK_PROVIDER="aws-kms"))
    with pytest.raises(StorageKeyError, match="must be one of"):
        create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, KUNO_STORAGE_KEK_PROVIDER="cloudflare"))
    missing = aws.key_arn.rsplit("/", 1)[0] + "/00000000-0000-0000-0000-000000000000"
    with pytest.raises(StorageKeyError, match="GenerateDataKey"):
        create_app(production(aws, KUNO_C2PA_TSA_URL=TSA, **{**kms(aws), "KUNO_STORAGE_KMS_KEY_ID": missing}))
