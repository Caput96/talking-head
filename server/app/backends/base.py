"""The internal TTS backend seam.

Every engine that runs inside the server implements `TTSBackend` — the stub now,
`MlxTTSBackend` (Qwen3-TTS) in slice 2b. It is deliberately **backend-agnostic**:
a backend returns raw audio samples, nothing engine-, model-, or platform-shaped
crosses this boundary. The server layer (app/main.py) owns transport — encoding
the samples to WAV for the HTTP response — so a new backend never touches the
wire format, and MLX-specific types never leak toward /web (ADR-004 §2).
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
