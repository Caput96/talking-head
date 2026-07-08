"""Backend selection.

`get_backend()` / `get_stt_backend()` pick the concrete TTS/STT engine *inside*
the server, chosen by the `TTS_BACKEND` / `STT_BACKEND` env vars — the "backend"
level of ADR-004 §3's two-level choice (the "provider" level — browser vs
server — lives in /web). `MlxWhisperBackend` slotted in here additively for
STT (slice STT-b), exactly how `MlxTTSBackend` did for TTS — no change to the
provider, the HTTP contract, or /web.
"""

import os

from .base import STTBackend, TTSBackend
from .stub import StubTTSBackend
from .stub_stt import StubSTTBackend

# Default Qwen3-TTS model: the 0.6B 8-bit **CustomVoice** build. CustomVoice —
# not Base — is the multi-speaker variant that conditions on a fixed named
# speaker embedding, so a given voice sounds the SAME on every request. The Base
# build has no trained speakers: it treats `voice` as a free label and samples a
# new random speaker each generation (temperature 0.9), which is wrong for a
# talking head that should keep one identity. Override via env for a bigger model
# (e.g. mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit) or a different voice.
DEFAULT_MLX_MODEL = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
# A built-in speaker of the CustomVoice model. This model validates the name and
# rejects unknown ones; its set is
# ['serena','vivian','uncle_fu','ryan','aiden','ono_anna','sohee','eric','dylan'].
DEFAULT_MLX_VOICE = "serena"

# Default Whisper model: the small 8-bit multilingual build (~282 MiB
# download). Benchmarked on this machine against the large-v3-turbo 8-bit
# build (~824 MiB) — see docs/BUILDLOG.md for the RTF numbers behind this
# choice. Override via env for higher quality.
DEFAULT_MLX_STT_MODEL = "mlx-community/whisper-small-mlx-8bit"


def get_backend() -> TTSBackend:
    name = os.environ.get("TTS_BACKEND", "stub")
    if name == "stub":
        return StubTTSBackend()
    if name == "mlx":
        # Deferred import: MlxTTSBackend pulls in mlx-audio (macOS-only extra), so
        # only import it when the mlx backend is actually selected — keeps this
        # module importable on CI/linux where mlx-audio isn't installed.
        from .mlx import MlxTTSBackend

        return MlxTTSBackend(
            model_id=os.environ.get("MLX_TTS_MODEL", DEFAULT_MLX_MODEL),
            voice=os.environ.get("MLX_TTS_VOICE", DEFAULT_MLX_VOICE),
            language=os.environ.get("MLX_TTS_LANGUAGE", "auto"),
        )
    # Fail loudly rather than silently falling back, so a misconfigured backend is
    # obvious instead of masquerading as the stub.
    raise ValueError(f"unknown TTS_BACKEND={name!r} (available: 'stub', 'mlx')")


def get_backend_name() -> str:
    return os.environ.get("TTS_BACKEND", "stub")


def get_stt_backend() -> STTBackend:
    name = os.environ.get("STT_BACKEND", "stub")
    if name == "stub":
        return StubSTTBackend()
    if name == "mlx":
        # Deferred import: MlxWhisperBackend pulls in mlx-whisper (macOS-only
        # extra), so only import it when the mlx backend is actually selected —
        # keeps this module importable on CI/linux where it isn't installed.
        from .mlx_whisper import MlxWhisperBackend

        return MlxWhisperBackend(
            model_id=os.environ.get("MLX_STT_MODEL", DEFAULT_MLX_STT_MODEL),
            language=os.environ.get("MLX_STT_LANGUAGE", "auto"),
        )
    raise ValueError(f"unknown STT_BACKEND={name!r} (available: 'stub', 'mlx')")


def get_stt_backend_name() -> str:
    return os.environ.get("STT_BACKEND", "stub")
