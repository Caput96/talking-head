"""MlxWhisperBackend test — real Whisper transcription.

Double-gated so it never runs by accident (it downloads a multi-GB-ish model
and needs Apple Silicon + the mlx extra):
  1. `importorskip` — skipped where mlx-whisper isn't installed (CI / linux).
  2. `RUN_MLX_TESTS` env — skipped unless explicitly opted in.
Run locally with: RUN_MLX_TESTS=1 uv run --extra mlx pytest tests/test_mlx_whisper_backend.py

These are smoke tests (does it run, is the shape sane), not accuracy tests —
the input is a synthetic tone, not real speech, same spirit as
test_mlx_backend.py's waveform-bounds checks for TTS.
"""

import os

import numpy as np
import pytest

pytest.importorskip("mlx_whisper", reason="mlx extra not installed (uv sync --extra mlx)")

pytestmark = pytest.mark.skipif(
    not os.environ.get("RUN_MLX_TESTS"),
    reason="set RUN_MLX_TESTS=1 to run the MLX Whisper backend test (downloads a model)",
)

from app.backends import DEFAULT_MLX_STT_MODEL
from app.backends.mlx_whisper import MlxWhisperBackend


def _tone(seconds: float, sample_rate: int) -> np.ndarray:
    t = np.arange(int(seconds * sample_rate), dtype=np.float32) / sample_rate
    return (0.2 * np.sin(2 * np.pi * 220.0 * t)).astype(np.float32)


def test_transcribes_without_error_and_returns_sane_shape() -> None:
    backend = MlxWhisperBackend(model_id=DEFAULT_MLX_STT_MODEL, language="auto")
    result = backend.transcribe(_tone(1.0, 16_000), 16_000)

    assert isinstance(result.text, str)
    assert isinstance(result.language, str) and len(result.language) > 0


def test_resamples_non_16khz_input_without_error() -> None:
    # 24 kHz matches the stub/Kokoro rate — exercises the resample path
    # (Whisper hard-requires 16 kHz; non-matching input must be resampled first).
    backend = MlxWhisperBackend(model_id=DEFAULT_MLX_STT_MODEL, language="auto")
    result = backend.transcribe(_tone(1.0, 24_000), 24_000)

    assert isinstance(result.text, str)
