"""MlxTTSBackend — the first real TTS engine: Qwen3-TTS via mlx-audio.

Runs Qwen3-TTS natively on Apple Silicon (MLX). It implements the same
`TTSBackend` seam the stub does (app/backends/base.py) and returns the same plain
`SynthesizedAudio` (numpy samples + sample rate), so nothing MLX-shaped —
`mlx_audio`, `mx.array`, model ids — ever crosses toward the HTTP layer or /web.
Swapping stub↔mlx is the `TTS_BACKEND` env choice, no code change (ADR-004 §3).

macOS-only: `mlx-audio` is the darwin optional extra (`uv sync --extra mlx`), so
its import is DEFERRED into `_ensure_model` — this module stays importable on CI
/ linux (stub-only) where mlx-audio isn't installed.
"""

import threading

import numpy as np

from .base import SynthesizedAudio, TTSBackend


class MlxTTSBackend(TTSBackend):
    def __init__(self, *, model_id: str, voice: str | None = None, language: str = "auto") -> None:
        self._model_id = model_id
        self._voice = voice
        # Qwen3-TTS's `lang_code`; "auto" lets it detect the text's language
        # (so multilingual — the ADR-004 motivation — works out of the box).
        self._language = language
        self._model = None  # loaded lazily on first synthesize (see _ensure_model)
        self._load_lock = threading.Lock()  # guards one-time model load
        self._gen_lock = threading.Lock()  # serializes generate (MLX eval isn't concurrency-safe)

    def _ensure_model(self):
        # Double-checked lazy load: the server starts (and /health responds)
        # instantly; the multi-GB download + parse happens on the first real
        # request, not at import. Mirrors /web's lazy Kokoro loadModel().
        if self._model is None:
            with self._load_lock:
                if self._model is None:
                    # Deferred import — see module docstring (macOS-only extra).
                    from mlx_audio.tts.utils import load_model

                    self._model = load_model(self._model_id)
        return self._model

    def voices(self) -> list[str]:
        # The model validates speaker names against this set (see synthesize's
        # fallback); exposing it lets /web build a correct picker for whatever
        # model is configured, no hardcoding.
        return list(self._ensure_model().supported_speakers)

    def languages(self) -> list[str]:
        return list(self._ensure_model().supported_languages)

    def supports_instruct(self) -> bool:
        # VoiceDesign models require an instruct (voice description); CustomVoice
        # models accept an optional instruct (tone/emotion) EXCEPT the 0.6B build,
        # which ignores it (mlx-audio drops instruct when tts_model_size=="0b6").
        # Base models have no instruct. Mirror mlx-audio's own gate.
        cfg = self._ensure_model().config
        model_type = getattr(cfg, "tts_model_type", "base")
        model_size = getattr(cfg, "tts_model_size", "")
        if model_type == "voice_design":
            return True
        if model_type == "custom_voice":
            return model_size != "0b6"
        return False

    @staticmethod
    def _pick(value: str, supported, fallback: str) -> str:
        """Return `value` if it's supported (case-insensitively, in the model's
        own casing), else `fallback`."""
        canonical = {s.lower(): s for s in supported}
        return canonical.get(value.lower(), fallback)

    def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        speed: float | None = None,
        language: str | None = None,
        instruct: str | None = None,
    ) -> SynthesizedAudio:
        model = self._ensure_model()

        # Honor a valid requested voice/language, else fall back to the configured
        # default. The model raises on an unknown speaker/lang_code; validating
        # here turns a stale or wrong client value into a graceful default instead
        # of a 500 (the /web picker already only offers supported values).
        voice = self._pick(voice or self._voice, model.supported_speakers, self._voice)
        language = self._pick(language or self._language, model.supported_languages, self._language)
        # `instruct` (tone/style) is passed through only when this model honors it;
        # otherwise send None so an unsupported model isn't fed a stray prompt.
        # Empty string → None so a blank box behaves like "no instruction".
        instruct = (instruct or None) if self.supports_instruct() else None

        # generate() yields GenerationResult segments (split on newlines / chunked),
        # each with `.audio` (mx.array) and `.sample_rate`. Serialize the call.
        with self._gen_lock:
            results = list(
                model.generate(
                    text=text,
                    voice=voice,
                    lang_code=language,
                    speed=speed if speed is not None else 1.0,
                    instruct=instruct,
                )
            )
        if not results:
            raise RuntimeError("Qwen3-TTS returned no audio segments")

        # mx.array → float32 mono numpy, concatenated across segments. Converting
        # to numpy here is exactly where the MLX type stops — the seam above only
        # ever sees plain arrays.
        samples = np.concatenate(
            [np.asarray(r.audio, dtype=np.float32).reshape(-1) for r in results]
        )
        # Read the rate from the engine (Qwen3's "12Hz" is the codec token rate,
        # not the waveform rate) — never hardcode it.
        sample_rate = int(getattr(results[0], "sample_rate", None) or model.sample_rate)
        return SynthesizedAudio(samples=samples, sample_rate=sample_rate)
