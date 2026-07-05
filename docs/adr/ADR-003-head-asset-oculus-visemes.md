# ADR-003 — Head asset: custom low-poly mesh with Oculus viseme morph targets

- **Status:** Accepted

## Context

Phase 5's first step (amplitude-driven lip-sync, ADR-001 §5) is working: RMS
from `AudioBus` opens and closes the mouth group. The second step —
**viseme-driven** lip-sync — needs actual mouth *shapes* (a "P" looks
different from an "O"), which raises two coupled questions this ADR settles:

1. **Where does a head asset with mouth shapes come from?**
2. **Which viseme convention do those shapes follow?**

### The asset problem

Three approaches were tried or investigated before landing on a custom asset:

- **Procedurally generated low-poly head** (scripted geometry). The overall
  silhouette was acceptable, but the mouth region was topologically too
  simple: no lip line, no concentric edge loops around the lips. Mouth
  movement quality comes from deformable geometry around the lips, not from
  overall poly count — with a sealed, sparse mouth patch there is nothing to
  deform, regardless of how the shapes are authored.
- **Ready-made assets.** Free low-poly heads *with* viseme blend shapes
  essentially do not exist as downloadable assets. The candidates found were
  either far too sparse to animate (a 128-triangle Sketchfab head leaves ~a
  dozen vertices for the whole mouth) or too realistic for the project's
  retro aesthetic (MetaHuman; Ready Player Me, which ships ARKit/Oculus
  morphs but reads as an uncanny realistic human even before shading is
  stripped). RPM also strips morph targets from GLB exports unless
  explicitly requested via URL parameters — workable, but the silhouette
  objection stands.
- **Decimating an existing ARKit head** down to low-poly: fragile. Blender's
  Decimate cannot be applied to a mesh with shape keys, and the workarounds
  collapse each shape key differently. Ruled out early.

### The convention problem

Two morph-target conventions dominate: **ARKit** (52 blend shapes covering
full facial expression) and **Oculus visemes** (15 shapes covering speech
mouth positions only). The runtime driver selected for viseme extraction,
**wawa-lipsync** (MIT), analyzes audio in real time and outputs weights named
after the 15 Oculus visemes (`viseme_sil`, `viseme_PP`, `viseme_FF`, …,
`viseme_ou`).

This also resolves a known gap: `TTSResult.timings` has been empty since
Phase 4 because neither Kokoro nor Piper exposes phoneme timing (ADR-002).
Deriving visemes from the *audio itself* at playback time sidesteps the need
for phoneme timestamps entirely — the TTS engine doesn't need to cooperate.

## Decision

**A custom low-poly head with 15 hand-sculpted Oculus viseme shape keys,
authored in Blender and exported as GLB.**

- **Base mesh:** a downloaded low-poly head (CC0) with real lip topology
  (separable upper/lower lips, edge loops around the mouth), lightly
  adjusted where the mouth region needed density.
- **Viseme set:** the 15 Oculus visemes, not ARKit's 52. Rationale:
  15 shapes is a tractable amount of sculpting work; speech is the only
  facial behavior currently in scope; and the shape-key names can match
  wawa-lipsync's output **exactly** (`viseme_XX`), making the naming
  convention itself the integration contract — no translation layer exists
  at runtime, weights flow from analyzer to mesh by name.
- **Authoring workflow:** shape keys were sculpted via scripted deformations
  in Blender (driven through the blender-mcp connection), constrained to
  named vertex groups (`jaw`, `upper_lip`, `lower_lip`, `mouth_corners`,
  `jaw_pivot`) defined manually beforehand. The vertex groups act as the
  boundary between human topology judgment and scripted deformation: scripts
  may only move vertices inside the relevant groups. Each viseme was
  reviewed (front + side view) before acceptance, with incremental `.blend`
  backups, since scripted edits don't reliably undo.
- **Asset contract:** the exported GLB (mesh + 15 named morph targets) is
  validated by `scripts/validate-head-glb.mjs` as a permanent asset-pipeline
  check (names present, Basis intact, vertex counts consistent). The head
  mesh is a **replaceable asset behind the viseme-name contract**: any future
  head exposing the same 15 names slots in without code changes.

### Consequence for the animation primitive

The head's lip-sync moves from writing raw vertex positions to setting named
`mesh.morphTargetInfluences` weights — morphing happens in the vertex shader,
so it works unchanged on `Points` and wireframe materials. This is a **second
animation path alongside** the ADR-001 positions buffer, not a replacement:
parametric/point-cloud shapes (math surfaces, pendulums, the future thinking
cloud) continue through `MorphEngine`'s buffer, while the GLB head is driven
by morph weights. The driver is a `MorphSource`-shaped strategy on the viseme
side (`HeadMorphController` pulling from wawa-lipsync each frame — the same
pull-model precedent `AudioBus` used before it was removed, see ADR-001), so
the boundary from ADR-001 holds: the engine and existing sources need no
changes.

## Runtime flow (updated from ADR-001)

```
text → TTSProvider → audio
     → wawa-lipsync bridge (WAV-encodes it, plays via <audio> element)
     → wawa-lipsync (audio features → single dominant viseme per frame)
     → HeadMorphController (eases dominant viseme into 15 target weights)
     → mesh.morphTargetInfluences
```

wawa-lipsync exposes only the current *dominant* viseme each frame (a single
`VISEMES` value, e.g. `viseme_aa`), not a 15-value blend directly —
`HeadMorphController` is what turns that single name into smooth weights
across all 15 targets (easing the dominant one toward 1, the rest toward 0).
The RMS/`AudioBus`/`LipSyncSource` fallback path sketched in earlier drafts of
this ADR was removed rather than kept: see ADR-001's updated addendum for why
(short version — viseme detection is itself amplitude/frequency analysis, so
the "fallback" wasn't a different signal, just a cruder read of the same one,
and its target mesh no longer renders).

## Consequences

**Positive**
- Viseme-shaped mouth movement instead of amplitude-only jaw flapping.
- No runtime translation layer: shape-key names *are* the contract.
- Phoneme-timing gap in `TTSResult` becomes moot — visemes are derived from
  audio at playback, engine-independent.
- Asset is owned outright with a clean license story and is swappable behind
  the 15-name contract.

**Negative / costs**
- Two coexisting animation paths (positions buffer, morph weights). The
  boundary must stay explicit or the codebase gets confusing.
- Editing a viseme means a Blender round-trip and re-export; the asset is
  now maintained artwork, not just data.
- 15 Oculus shapes cover speech only. Facial expression (brows, blinks,
  emotion) is out of scope; adopting it later means new shapes or an ARKit
  migration — a future ADR if it happens.

## Alternatives considered

- **Procedural head generation:** rejected — mouth topology too simple to
  deform convincingly; the problem is geometry, not shape authoring.
- **Ready-made asset (RPM, Sketchfab, marketplaces):** rejected — free
  low-poly heads with visemes effectively don't exist; RPM is
  aesthetically wrong for the project despite its complete morph set.
- **ARKit 52 blend shapes:** rejected for now — 3.5× the sculpting work,
  and would require mapping wawa-lipsync's Oculus output onto ARKit names,
  i.e. exactly the translation layer this decision avoids.
- **Rhubarb Lip Sync (precomputed viseme JSON from audio files):** deferred,
  not rejected — a possible future upgrade for higher accuracy on known
  audio, orthogonal to the asset and to the morph-weight path.
