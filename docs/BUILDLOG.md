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

### 2
note: how to manage mouth group knwing that in the future the head can change and/or uploaded by the user    (GLTFLoader)
the generated head is not well done

### 3
added faces (difference with ADR)

## 2026-07-XX — Phase 4
### 1
crfeated a new ADR to choose the tts provider, limited calude to use only web browser kokoro with some adjsustment and look for a server based approach for later

## 2026-07-05 — The head asset: three dead ends, one custom mesh (ADR-003)

**The problem.** Phase 5's viseme step needed a head with actual mouth
shapes. What looked like a shopping trip turned out to be a build decision.

**Rejected proposal #1 — procedural head.** Claude generated a low-poly head
procedurally. Silhouette: fine. Mouth: a sealed, sparse patch with no lip
line and no edge loops — nothing to deform. Key learning captured in the
ADR: mouth movement quality comes from lip topology, not poly count. Rejected
after visual inspection, not after wiring it in — cheap failure.

**Rejected proposal #2 — download one.** Searched for a free low-poly head
with viseme blend shapes. The category essentially doesn't exist: candidates
were either ~128 triangles (unanimatable) or full-realistic (MetaHuman, Ready
Player Me — wrong aesthetic even stripped to points/wireframe, plus RPM
silently strips morphs from exports unless you know the magic URL parameter).

**Decision — build it.** Downloaded a CC0 base mesh with real lip loops and
sculpted the viseme shape keys in Blender, with Claude driving deformation
scripts through blender-mcp.

**ARKit vs Oculus.** ARKit's 52 blend shapes vs Oculus's 15 visemes. Chose
Oculus: speech is the only behavior in scope, 15 shapes is a day of work
instead of a week, and — the deciding detail — wawa-lipsync outputs weights
already named `viseme_XX` in the Oculus convention. Naming the shape keys
identically makes the convention itself the integration contract: zero
translation code at runtime.

**AI oversight, Blender edition.** The Blender collaboration used the same
discipline as plan mode in Claude Code, adapted to a destructive medium:

- Vertex groups (`jaw`, `upper_lip`, `lower_lip`, `mouth_corners`,
  `jaw_pivot`) defined *by hand first* as the contract — scripts were only
  allowed to move vertices inside the relevant groups.
- One viseme per exchange, front + side screenshot, explicit approval before
  the next. (Also a practical MCP-timeout mitigation.)
- Incremented `.blend` backup after every approved shape key, because
  scripted edits don't reliably undo. Trust the process, not the undo stack.
- A scene audit before any deformation caught the classic failure modes
  early: seam vertices in both lip groups, jaw group swallowing the upper
  lip, pivot vertices inside the moving jaw set.

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
