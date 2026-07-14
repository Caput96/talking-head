"""The internal TTS/STT backend seams.

Every engine that runs inside the server implements `TTSBackend` or `STTBackend`
— the stub backends now, `MlxTTSBackend`/`MlxWhisperBackend` as the real engines.
Both are deliberately **backend-agnostic**: a TTS backend returns raw audio
samples, an STT backend returns plain text — nothing engine-, model-, or
platform-shaped crosses either boundary. The server layer (app/main.py) owns
transport — WAV encode/decode — so a new backend never touches the wire format,
and MLX-specific types never leak toward /web (ADR-004 §2).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass
class SynthesizedAudio:
    """A backend's output: mono float32 PCM in [-1, 1], plus its sample rate."""

    samples: np.ndarray
    sample_rate: int


class TTSBackend(ABC):
    @abstractmethod
    def synthesize(
        self,
        text: str,
        *,
        voice: str | None = None,
        speed: float | None = None,
        language: str | None = None,
        instruct: str | None = None,
    ) -> SynthesizedAudio:
        """Turn `text` into audio samples. `voice`/`speed`/`language`/`instruct`
        are optional hints a backend may honor or ignore (the stub ignores them).
        `instruct` is a free-text tone/style prompt, only meaningful when
        `supports_instruct()` is True."""

    def voices(self) -> list[str]:
        """The speaker names this backend offers, for /web to populate a picker.
        Empty by default (a backend with no selectable voices)."""
        return []

    def languages(self) -> list[str]:
        """The language codes this backend accepts (e.g. 'auto', 'english').
        Empty by default (no language control)."""
        return []

    def supports_instruct(self) -> bool:
        """Whether this backend honors a free-text tone/style `instruct` prompt,
        so /web can conditionally show a "voice tone" box. False by default."""
        return False


@dataclass
class Transcript:
    """An STT backend's output: the recognized text, plus whichever language it
    actually used or detected (not necessarily the one requested — e.g. 'auto')."""

    text: str
    language: str | None = None


class STTBackend(ABC):
    @abstractmethod
    def transcribe(
        self,
        samples: np.ndarray,
        sample_rate: int,
        *,
        language: str | None = None,
    ) -> Transcript:
        """Turn mono float32 PCM samples (in [-1, 1]) into text. `language` is an
        optional hint (e.g. 'auto' to let the backend detect it, or a specific
        code to force it); a backend may ignore it (the stub does)."""

    def languages(self) -> list[str]:
        """The language hints this backend accepts. Empty by default (no
        language control — /web then hides the language picker)."""
        return []
