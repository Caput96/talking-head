"""MlxWhisperBackend — the first real STT engine: Whisper via mlx-whisper.

Runs Whisper natively on Apple Silicon (MLX). Implements the same `STTBackend`
seam the stub does (app/backends/base.py) and returns the same plain
`Transcript`, so nothing MLX/Whisper-shaped — `mlx_whisper`, ISO language codes,
model ids — ever crosses toward the HTTP layer or /web. Swapping stub<->mlx is
the `STT_BACKEND` env choice, no code change (ADR-004 §3), mirroring
MlxTTSBackend's role on the TTS side.

macOS-only: `mlx-whisper` is the darwin optional extra (`uv sync --extra mlx`),
so its import is DEFERRED into `transcribe` — this module stays importable on
CI/linux (stub-only) where mlx-whisper isn't installed.
"""

import math
import threading

import numpy as np

from .base import STTBackend, Transcript

# Whisper needs mono float32 at exactly this rate; anything else must be
# resampled before transcribe() ever sees it (see transcribe()'s docstring
# note below on why we always pass an array, never a file path).
_WHISPER_SAMPLE_RATE = 16_000

# Full words (matching the TTS picker's style) <-> Whisper's own ISO-639-1
# codes. Keeps /web in one vocabulary across both capabilities; only this
# backend ever sees a code.
_LANGUAGE_WORDS = [
    "english",
    "italian",
    "german",
    "spanish",
    "portuguese",
    "french",
    "russian",
    "chinese",
    "japanese",
    "korean",
]


class MlxWhisperBackend(STTBackend):
    def __init__(self, *, model_id: str, language: str = "auto") -> None:
        self._model_id = model_id
        self._language = language
        self._gen_lock = threading.Lock()  # serializes transcribe (MLX eval isn't concurrency-safe)
        self._word_to_code: dict[str, str] | None = None  # built lazily, needs mlx_whisper's LANGUAGES

    def languages(self) -> list[str]:
        return ["auto", *_LANGUAGE_WORDS]

    def _ensure_language_maps(self):
        # Deferred import — see module docstring (macOS-only extra).
        from mlx_whisper.tokenizer import LANGUAGES

        if self._word_to_code is None:
            code_to_word = {code: word for code, word in LANGUAGES.items() if word in _LANGUAGE_WORDS}
            self._word_to_code = {word: code for code, word in code_to_word.items()}
        return LANGUAGES

    def _resample(self, samples: np.ndarray, sample_rate: int) -> np.ndarray:
        if sample_rate == _WHISPER_SAMPLE_RATE:
            return samples
        # Polyphase resampling (scipy.signal.resample_poly) is the standard
        # choice for audio: better anti-aliasing than a plain FFT resample.
        # Reduce the rate ratio via gcd so up/down stay small integers.
        from scipy.signal import resample_poly

        g = math.gcd(_WHISPER_SAMPLE_RATE, sample_rate)
        up, down = _WHISPER_SAMPLE_RATE // g, sample_rate // g
        return resample_poly(samples, up, down).astype(np.float32)

    def transcribe(
        self,
        samples: np.ndarray,
        sample_rate: int,
        *,
        language: str | None = None,
    ) -> Transcript:
        # Deferred import — see module docstring.
        import mlx_whisper

        languages = self._ensure_language_maps()
        assert self._word_to_code is not None

        # Always pass a numpy array, never a file path: mlx_whisper.transcribe()
        # only shells out to a system `ffmpeg` binary (an undeclared dependency
        # we don't want) for the path form. The array form is used as-is with
        # no internal resampling, so it must already be 16 kHz mono float32 —
        # hence the explicit resample above.
        audio = self._resample(np.asarray(samples, dtype=np.float32), sample_rate)

        word = (language or self._language).lower()
        code = self._word_to_code.get(word)  # None (incl. "auto") -> let Whisper auto-detect

        with self._gen_lock:
            result = mlx_whisper.transcribe(audio, path_or_hf_repo=self._model_id, language=code)

        detected_code = result.get("language")
        detected_word = languages.get(detected_code, detected_code) if detected_code else None
        return Transcript(text=result["text"].strip(), language=detected_word)
