"""WAV encoding/decoding — the server's transport concern, kept out of the
backends.

TTS backends return float32 samples (app/backends/base.py); `encode_wav` turns
them into the 16-bit PCM WAV bytes the `/synthesize` response carries. STT runs
the same conversion in reverse: `decode_wav` reads the WAV bytes /web's
`ServerSTTProvider` POSTs to `/transcribe` back into float32 samples an
`STTBackend` can consume. WAV both ways because it's universal and the browser
encodes/decodes it directly via Web Audio, needing no codec on either side.
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


def decode_wav(data: bytes) -> tuple[np.ndarray, int]:
    """Decode 16-bit PCM WAV bytes into mono float32 samples in [-1, 1], the
    inverse of `encode_wav`. Multi-channel input is averaged down to mono —
    STT backends only ever see one channel."""
    with wave.open(io.BytesIO(data), "rb") as wav:
        sample_rate = wav.getframerate()
        n_channels = wav.getnchannels()
        raw = wav.readframes(wav.getnframes())

    pcm16 = np.frombuffer(raw, dtype="<i2")
    if n_channels > 1:
        pcm16 = pcm16.reshape(-1, n_channels).mean(axis=1)
    samples = (pcm16.astype(np.float32)) / 32767.0
    return samples, sample_rate
