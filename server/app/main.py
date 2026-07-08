"""FastAPI app exposing the local TTS HTTP seam (ADR-004 §4).

/web's ServerTTSProvider is a thin HTTP adapter over `POST /synthesize`. The
response is opaque `audio/wav` bytes — no JSON envelope and no phoneme timing:
ADR-003 derives visemes from the produced audio at playback, so the wire contract
carries no timing burden. The browser only ever talks to localhost.
"""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .audio import encode_wav
from .backends import get_backend, get_backend_name

app = FastAPI(title="3d.head TTS server", version="0.0.0")

# The Vite dev server runs on the same host, a different port (5173, or 5174 as a
# fallback), so requests are cross-origin. Allow any localhost port in dev; the
# browser still only reaches a process on the user's own machine.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://localhost:\d+$",
    allow_methods=["*"],
    allow_headers=["*"],
)

# One backend instance for the process, chosen from config (TTS_BACKEND).
_backend = get_backend()


class SynthesizeRequest(BaseModel):
    # Mirrors, by hand, the request shape /web sends. `voice`/`speed`/`language`
    # correspond to TTSOptions in packages/contracts/src/tts.ts (the canonical TS
    # definition) — kept in sync manually; see server/README.md for why no
    # OpenAPI→TS codegen yet. The stub ignores them all.
    text: str
    voice: str | None = None
    speed: float | None = None
    language: str | None = None
    instruct: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "backend": get_backend_name()}


@app.get("/capabilities")
def capabilities() -> dict[str, object]:
    # What the active backend offers, so /web can build a provider-correct voice
    # and language picker (and conditionally a tone/instruct box) without
    # hardcoding model specifics. For the MLX backend this triggers a lazy model
    # load on first call (and thereby warms it).
    return {
        "voices": _backend.voices(),
        "languages": _backend.languages(),
        "instruct": _backend.supports_instruct(),
    }


@app.post(
    "/synthesize",
    responses={200: {"content": {"audio/wav": {}}}},
    response_class=Response,
)
def synthesize(req: SynthesizeRequest) -> Response:
    audio = _backend.synthesize(
        req.text,
        voice=req.voice,
        speed=req.speed,
        language=req.language,
        instruct=req.instruct,
    )
    wav = encode_wav(audio.samples, audio.sample_rate)
    return Response(content=wav, media_type="audio/wav")
