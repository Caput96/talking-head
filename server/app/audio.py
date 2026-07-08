"""WAV encoding — the server's transport concern, kept out of the backends.

Backends return float32 samples (app/backends/base.py); this turns them into the
16-bit PCM WAV bytes the HTTP response carries. WAV because it is universal and
the browser decodes it directly via `AudioContext.decodeAudioData` (see /web's
ServerTTSProvider), needing no codec.
"""

import io
import wave

import numpy as np


def encode_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    """Encode mono float32 PCM in [-1, 1] as a 16-bit PCM WAV."""
    # Clip then scale to int16. `* 32767` (not 32768) keeps +1.0 in range and
    # symmetric with -1.0 → -32767, avoiding a wrap at the positive extreme.
    clipped = np.clip(samples, -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype("<i2")  # little-endian int16

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(sample_rate)
        wav.writeframes(pcm16.tobytes())
    return buffer.getvalue()
