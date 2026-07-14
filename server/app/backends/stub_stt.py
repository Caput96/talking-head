"""StubSTTBackend — proves the STT seam end to end, no model, no MLX.

Mirrors StubTTSBackend's role for TTS: it doesn't recognize anything, it just
returns a fixed, obviously-fake string that also reports how much audio it
received. That's enough to prove `mic -> WAV -> POST /transcribe -> JSON -> UI`
works before pulling in a real Whisper model. Replaced by MlxWhisperBackend in
slice STT-b.
"""

import numpy as np

from .base import STTBackend, Transcript


class StubSTTBackend(STTBackend):
    def transcribe(
        self, samples: np.ndarray, sample_rate: int, *, language: str | None = None
    ) -> Transcript:
        duration = len(samples) / sample_rate if sample_rate else 0.0
        return Transcript(
            text=f"(stub transcript — {duration:.1f}s of audio received)",
            language=language or "auto",
        )
