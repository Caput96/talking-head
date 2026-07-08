"""StubTTSBackend — a fixed synthetic voice, no model, no MLX.

Its only job is to prove the server-TTS seam end to end (slice 2a): it returns a
short, deterministic tone broken into a few on/off "syllable" bursts. The bursts
matter — wawa-lipsync in /web derives visemes from the audio's changing features,
so steady silence or a flat tone would barely move the mouth; alternating
energy makes the head visibly "talk". Replaced by a real engine in slice 2b.
"""

import numpy as np

from .base import SynthesizedAudio, TTSBackend

_SAMPLE_RATE = 24_000  # matches Kokoro's rate; arbitrary but keeps the two paths alike
_TONE_HZ = 180.0  # low-ish pitch so the tone reads as a "voice", not a beep
_SYLLABLE_SEC = 0.18
_GAP_SEC = 0.07


class StubTTSBackend(TTSBackend):
    def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        speed: float | None = None,
        language: str | None = None,
        instruct: str | None = None,
    ) -> SynthesizedAudio:
        # Roughly one burst per word, clamped so tiny/huge inputs stay sane. The
        # exact count is cosmetic — this is a stand-in, not a real utterance.
        words = max(1, len(text.split()))
        n_bursts = min(12, max(2, words))

        syllable = self._tone(_SYLLABLE_SEC)
        gap = np.zeros(int(_GAP_SEC * _SAMPLE_RATE), dtype=np.float32)

        segments: list[np.ndarray] = []
        for i in range(n_bursts):
            segments.append(syllable)
            if i < n_bursts - 1:
                segments.append(gap)

        samples = np.concatenate(segments).astype(np.float32)
        return SynthesizedAudio(samples=samples, sample_rate=_SAMPLE_RATE)

    def _tone(self, seconds: float) -> np.ndarray:
        n = int(seconds * _SAMPLE_RATE)
        t = np.arange(n, dtype=np.float32) / _SAMPLE_RATE
        wave = 0.35 * np.sin(2 * np.pi * _TONE_HZ * t)
        # Short raised-cosine fade in/out so each burst has a soft attack/decay
        # instead of a click — a click is broadband and would smear the visemes.
        fade = int(0.01 * _SAMPLE_RATE)
        if fade > 0 and n > 2 * fade:
            ramp = 0.5 * (1 - np.cos(np.pi * np.arange(fade, dtype=np.float32) / fade))
            wave[:fade] *= ramp
            wave[-fade:] *= ramp[::-1]
        return wave.astype(np.float32)
