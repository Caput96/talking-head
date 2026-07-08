"""MlxTTSBackend test — real Qwen3-TTS synthesis.

Double-gated so it never runs by accident (it downloads a multi-GB model and
needs Apple Silicon + the mlx extra):
  1. `importorskip` — skipped where mlx-audio isn't installed (CI / linux).
  2. `RUN_MLX_TESTS` env — skipped unless explicitly opted in.
Run locally with: RUN_MLX_TESTS=1 uv run --extra mlx pytest tests/test_mlx_backend.py
"""

import os

import numpy as np
import pytest

pytest.importorskip("mlx_audio", reason="mlx extra not installed (uv sync --extra mlx)")

pytestmark = pytest.mark.skipif(
    not os.environ.get("RUN_MLX_TESTS"),
    reason="set RUN_MLX_TESTS=1 to run the MLX backend test (downloads a multi-GB model)",
)

from app.backends import DEFAULT_MLX_MODEL, DEFAULT_MLX_VOICE
from app.backends.mlx import MlxTTSBackend


def _backend() -> MlxTTSBackend:
    return MlxTTSBackend(model_id=DEFAULT_MLX_MODEL, voice=DEFAULT_MLX_VOICE, language="auto")


def test_mlx_synthesizes_real_audio() -> None:
    out = _backend().synthesize("Hello, I am a talking head.")
    assert out.sample_rate > 0
    assert out.samples.dtype == np.float32
    assert out.samples.ndim == 1 and out.samples.size > 0
    # A real waveform stays within [-1, 1].
    assert float(np.abs(out.samples).max()) <= 1.0


def test_longer_text_makes_longer_audio() -> None:
    backend = _backend()
    short = backend.synthesize("Hi.")
    long = backend.synthesize("Hello there, this is a considerably longer sentence to speak aloud.")
    assert long.samples.size > short.samples.size
