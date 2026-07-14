"""Measure MLX-Whisper real-time factor (RTF) on THIS machine — ADR-004 STT-b.

RTF = wall-clock seconds to transcribe / seconds of audio transcribed.
RTF < 1 means faster than real time. Model load + one warmup transcribe are
excluded from the RTF numbers (they're one-time costs, reported separately).

Input speech is synthesized on the fly via the already-cached default MLX TTS
backend (same TEXTS bench_rtf.py uses) — no extra download, and it doubles as
a sanity check: the printed transcript should roughly match what was spoken.

Run:  uv run --directory server --extra mlx python scripts/bench_stt_rtf.py
Record the output in docs/BUILDLOG.md. No third-party numbers — measured here.
"""

import os
import statistics
import sys
import time

# Allow `import app...` when executed as a script from the server/ dir.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.backends import DEFAULT_MLX_MODEL, DEFAULT_MLX_STT_MODEL, DEFAULT_MLX_VOICE  # noqa: E402
from app.backends.mlx import MlxTTSBackend  # noqa: E402
from app.backends.mlx_whisper import MlxWhisperBackend  # noqa: E402

TEXTS = [
    "Hello.",
    "Hello, I am a talking head.",
    "The quick brown fox jumps over the lazy dog, again and again.",
    "This is a longer passage of text intended to measure steady-state synthesis "
    "throughput on Apple Silicon, spanning a couple of sentences worth of speech.",
]


def main() -> None:
    tts = MlxTTSBackend(model_id=DEFAULT_MLX_MODEL, voice=DEFAULT_MLX_VOICE, language="auto")
    print("synthesizing bench input speech via the (already-cached) default TTS model...")
    clips = [tts.synthesize(text) for text in TEXTS]

    model_id = os.environ.get("MLX_STT_MODEL", DEFAULT_MLX_STT_MODEL)
    print(f"\nmodel:   {model_id}")
    print(f"machine: {os.uname().machine}")

    backend = MlxWhisperBackend(model_id=model_id, language="auto")

    t0 = time.perf_counter()
    warmup = backend.transcribe(clips[0].samples, clips[0].sample_rate)
    print(f"load + warmup: {time.perf_counter() - t0:.1f}s (one-time)")
    print(f'warmup transcript: "{warmup.text}"\n')

    rtfs = []
    for text, clip in zip(TEXTS, clips):
        dur = len(clip.samples) / clip.sample_rate
        t = time.perf_counter()
        result = backend.transcribe(clip.samples, clip.sample_rate)
        wall = time.perf_counter() - t
        rtf = wall / dur
        rtfs.append(rtf)
        print(f'  audio={dur:5.2f}s  transcribe={wall:5.2f}s  RTF={rtf:.3f}  spoke="{text}"')
        print(f'    heard="{result.text}"')

    print(f"\nmedian RTF: {statistics.median(rtfs):.3f}   (RTF < 1 = faster than real time)")


if __name__ == "__main__":
    main()
