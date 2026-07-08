"""Measure Qwen3-TTS real-time factor (RTF) on THIS machine — ADR-004 slice 2b.

RTF = wall-clock seconds to generate / seconds of audio produced.
RTF < 1 means faster than real time. Model load + one warmup generation are
excluded from the RTF numbers (they're one-time costs, reported separately).

Run:  uv run --directory server --extra mlx python scripts/bench_rtf.py
Record the output in docs/BUILDLOG.md. No third-party numbers — measured here.
"""

import os
import statistics
import sys
import time

# Allow `import app...` when executed as a script from the server/ dir.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.backends import DEFAULT_MLX_MODEL  # noqa: E402
from app.backends.mlx import MlxTTSBackend  # noqa: E402

TEXTS = [
    "Hello.",
    "Hello, I am a talking head.",
    "The quick brown fox jumps over the lazy dog, again and again.",
    "This is a longer passage of text intended to measure steady-state synthesis "
    "throughput on Apple Silicon, spanning a couple of sentences worth of speech.",
]


def main() -> None:
    model_id = os.environ.get("MLX_TTS_MODEL", DEFAULT_MLX_MODEL)
    print(f"model:  {model_id}")
    print(f"machine: {os.uname().machine}")

    # Voice-agnostic: use whatever speaker the model actually offers, so the same
    # bench runs on any model (0.6B / 1.7B) without a speaker-name mismatch.
    backend = MlxTTSBackend(model_id=model_id, language="auto")

    t0 = time.perf_counter()
    backend._voice = backend.voices()[0]  # first access → loads the model
    backend.synthesize("Warm up.")  # first gen (load + warmup excluded from RTF)
    print(f"voice:  {backend._voice}")
    print(f"load + warmup: {time.perf_counter() - t0:.1f}s (one-time)\n")

    rtfs = []
    for text in TEXTS:
        t = time.perf_counter()
        out = backend.synthesize(text)
        wall = time.perf_counter() - t
        dur = len(out.samples) / out.sample_rate
        rtf = wall / dur
        rtfs.append(rtf)
        print(f"  chars={len(text):3d}  audio={dur:5.2f}s  gen={wall:5.2f}s  RTF={rtf:.3f}")

    print(f"\nmedian RTF: {statistics.median(rtfs):.3f}   (RTF < 1 = faster than real time)")


if __name__ == "__main__":
    main()
