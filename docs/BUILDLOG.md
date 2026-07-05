## 2026-07-XX — Phase 1
### 1
**What**: claude code instal a temp playwright to render into a browser
**Decision**: manually installed Playwright to avoid it
pnpm add -D playwright
pnpm exec playwright install chromium --with-deps

## 2026-07-XX — Phase 3
### 1
 skill: `add-new-shape` (factory+registry+test), repeatable. classify whether a requested shape fits the existing shared-grid design "for free," or needs a structural extension — and handle
each case differently rather than blindly scaffolding files.

## 2026-07-05 — Removed AudioBus/LipSyncSource, the amplitude lip-sync path

Once the GLB head + wawa-lipsync viseme path (ADR-003) was working end to
end, asked: do we still need the amplitude (RMS) path as a fallback, like
the original plan called for? Answer turned out to be no, and not just
"we don't need it" but "it was never really a different strategy" —
wawa-lipsync's viseme detection is itself real-time audio-feature analysis
(frequency bands, volume, spectral centroid), the same *kind* of signal RMS
was, just classified into 15 mouth shapes instead of one loudness scalar.
Keeping the old path "for comparison" would have meant writing a new adapter
from scratch anyway, since its target (vertex positions on the old
procedural head) stopped rendering back when the GLB head replaced it — so
it was already dead code with nothing left to compare against.

Deleted `core/AudioBus.ts` and `sources/LipSyncSource.ts` (+ tests), and the
`mouthGroup` plumbing that only existed to feed `LipSyncSource`
(`Formation.mouthGroup`, `buildHeadGeometry`'s mouth-vertex tagging,
`sampleMesh`'s param). `CompositeMorphSource` stays, now wrapping a single
`ShapeMorphSource` — kept wrapped rather than unwrapped, since CLAUDE.md's
roadmap already names the next source expected to join it (a future
`AgentStateSource`). ADR-001 and ADR-003 both got addenda reflecting this;
see ADR-001's updated §2/§5 addenda for the full reasoning.
