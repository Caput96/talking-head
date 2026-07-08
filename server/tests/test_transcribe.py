"""Server-side proof of the STT seam: the endpoint decodes a WAV body and
returns the stub's transcript as JSON."""

import numpy as np
from fastapi.testclient import TestClient

from app.audio import encode_wav
from app.main import app

client = TestClient(app)


def _silence_wav(seconds: float = 0.5, sample_rate: int = 24_000) -> bytes:
    samples = np.zeros(int(seconds * sample_rate), dtype=np.float32)
    return encode_wav(samples, sample_rate)


def test_transcribe_returns_stub_transcript() -> None:
    res = client.post(
        "/transcribe",
        content=_silence_wav(0.5),
        headers={"content-type": "audio/wav"},
    )

    assert res.status_code == 200
    body = res.json()
    assert "0.5" in body["text"]
    assert body["language"] == "auto"


def test_transcribe_honors_language_query_param() -> None:
    res = client.post(
        "/transcribe?language=italian",
        content=_silence_wav(0.2),
        headers={"content-type": "audio/wav"},
    )

    assert res.status_code == 200
    assert res.json()["language"] == "italian"


def test_stt_capabilities_empty_for_stub() -> None:
    res = client.get("/stt/capabilities")
    assert res.status_code == 200
    assert res.json() == {"languages": []}
