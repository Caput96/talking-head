"""Server-side proof of the TTS seam: the endpoint returns a real, valid WAV."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "backend": "stub"}


def test_synthesize_returns_valid_wav() -> None:
    res = client.post("/synthesize", json={"text": "hello there head"})

    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/wav"

    body = res.content
    # RIFF/WAVE header sanity — the browser's decodeAudioData needs a real WAV.
    assert body[:4] == b"RIFF"
    assert body[8:12] == b"WAVE"
    # Non-trivial payload: 44-byte header plus a meaningful chunk of PCM.
    assert len(body) > 44 + 1000


def test_synthesize_requires_text() -> None:
    # Missing required field → FastAPI/Pydantic validation error.
    res = client.post("/synthesize", json={})
    assert res.status_code == 422
