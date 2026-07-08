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

## 2026-07-07 — Monorepo migration, and ADR-002's single-project constraint retires (ADR-004, slice 1)

**The decision moment.** ADR-002 set a standing constraint — the repo stays a
**single Vite project, not a monorepo**, *until a server is actually
introduced*, at which point "that transition gets its own dedicated ADR." ADR-004
introduces a local TTS/STT server, so that trigger is now met: this is where the
constraint is **explicitly retired**, not silently broken. This first slice does
only the structural half — moving the app under `/web` with **no behavior
change** — and deliberately stops short of any server, Python, or provider
implementations (those are later ADR-004 slices).

**What moved.** The whole Vite app (`src/`, `public/`, `assets/`, `index.html`,
`vite.config.ts`, the three tsconfigs, `.oxlintrc.json`) went under `/web` via
`git mv`. New: `pnpm-workspace.yaml`; a root `package.json` that only delegates
(`pnpm --filter web …`, `pnpm -r typecheck`); a `/server` README stub; and
`/packages/contracts` holding the **types-only** `TTSProvider` / `STTProvider`
seams (ADR-004 §2), not yet consumed by `/web` — its local `TTSProvider.ts` was
left untouched so nothing about runtime behavior shifts. Native pnpm workspaces,
no Turborepo/Nx: one buildable app and no cross-package build graph to
orchestrate yet.

**The one real snag — R3F's JSX types vanished under pnpm.** After the move,
`tsc` reported every three.js element (`<mesh>`, `<group>`, `<points>`…) as
missing from `JSX.IntrinsicElements`. Root cause, confirmed by reproducing a
clean typecheck on the pre-move commit in a throwaway worktree: `@react-three/
fiber` adds those elements through a `declare module 'react' / 'react/jsx-runtime'`
augmentation, and for that augmentation to *bind*, `tsc` must resolve
`@types/react` by walking up from fiber's deep location in pnpm's isolated store.
In the single-project layout `@types/react` sat in the root `node_modules` and
was reachable; once every dep moved into `/web`, the workspace root had none, so
`@types/react` was exposed nowhere fiber could see it and the augmentation
silently dropped. Fix: a root `.npmrc` public-hoisting the React type packages
(`public-hoist-pattern[]=@types/react` / `@types/react-dom`), restoring a
reachable `@types/react` without loosening isolation for anything else. (A fresh
CI install picks this up on first run; an *existing* `node_modules` needed
`pnpm install --force` to re-link.)

**Verified behavior-preserving.** `pnpm typecheck` (web + contracts), `lint`,
`test` (35 tests), and `build` all green from the new paths, and a headless
browser drive confirmed the app boots, renders the point-cloud+wireframe head,
and morphs sphere→cube with zero console errors — identical to before.

**Doc/reality mismatch surfaced.** ADR-003 (§ line 75) references
`scripts/validate-head-glb.mjs` as a "permanent asset-pipeline guard," but that
script was never actually created — it exists nowhere in the repo. Noted here;
left as-is (neither created nor edited) since it's outside this migration's
scope.

## 2026-07-07 — Server-TTS seam proven with a stub, before any engine (ADR-004, slice 2a)

**The point of the slice.** Stand up the whole `/web → HTTP → /server` TTS path
and prove it drives the head, *before* writing any real inference — so slice 2b
(a real MLX/Qwen3 backend) is a pure drop-in behind an interface that's already
been exercised end to end. A `StubTTSBackend` returns a deterministic tone; no
model, no MLX, no download.

**Why it was cheap to bolt on.** The existing pipeline already consumes an
`AudioBuffer` (`TTSPanel` → `getWawaLipsync().play()`), so `ServerTTSProvider`
only had to fetch WAV bytes and `decodeAudioData` them — from there, WAV
re-encode → `<audio>` → wawa-lipsync visemes → `morphTargetInfluences` runs
byte-for-byte identically to the Kokoro path. The ADR-003 viseme path wasn't
touched at all. The server/browser choice is a build-time config flag
(`VITE_TTS_PROVIDER`) behind a `createTTSProvider()` factory; browser (Kokoro)
stays the zero-setup default.

**The internal backend seam is the real deliverable.** `TTSBackend.synthesize()
→ SynthesizedAudio{samples, sample_rate}` — backends return raw samples, the
server layer owns WAV encoding, so nothing engine-, model-, or platform-shaped
crosses toward `/web`. `MlxTTSBackend` implements the same method in 2b; a
`get_backend()` factory (`TTS_BACKEND` env) already exists to select it.

**Python toolchain decisions.** uv (not pip/Poetry/conda), Python pinned to 3.12
and verified **arm64-native** (`platform.machine() == 'arm64'`, not x86 under
Rosetta). `uv.lock` committed; CI gained a second job (`uv sync --locked` +
`uv run pytest` on ubuntu, portable deps only). MLX is **declared but not
installed** — a `sys_platform == 'darwin'` optional extra that `uv sync` skips
while the lock still records it, keeping the future portable-vs-MLX story honest.

**Contract kept by hand, codegen deferred.** The response is opaque WAV bytes and
the request is `{text} & TTSOptions`, so OpenAPI→TS codegen would generate almost
nothing for real cost; `@3d-head/contracts` stays canonical and the Pydantic
`SynthesizeRequest` mirrors three fields by hand. Revisit when STT returns a
structured JSON `Transcript`. `TTSResult.timings` stays the empty array it always
was — no timing field added to satisfy the server (visemes come from the audio).

## 2026-07-07 — Real Qwen3-TTS via MLX, dropped in behind the stub's seam (ADR-004, slice 2b)

**The whole slice was one new file's worth of engine.** `MlxTTSBackend`
(`server/app/backends/mlx.py`) implements the exact `TTSBackend.synthesize →
SynthesizedAudio` seam the stub used, registered under `TTS_BACKEND=mlx`.
`ServerTTSProvider`, the HTTP contract, and all of `/web` were untouched —
choosing the engine is an env var, and the stub stays as the CI/zero-setup
fallback. Backend-agnostic held: `mlx_audio`/`mx.array` live only inside that one
module, the seam still returns plain numpy, the wire is still opaque `audio/wav`.

**Model: Qwen3-TTS-12Hz-0.6B-Base-8bit** (~1.3 GB weights + a speech-token codec).
Started with the smaller 0.6B over 1.7B deliberately — cheapest download + fastest
inference to de-risk the integration and get an honest RTF floor; the model id is
an env var (`MLX_TTS_MODEL`), so 1.7B is a config swap, not code. `Base` gives
built-in named voices (`Chelsie`); `lang_code="auto"` means multilingual works
out of the box (the ADR-004 motivation).

**RTF measured on THIS machine — no third-party numbers.** Apple M4 Pro, 24 GB.
Once cached, model load + warmup ≈ **1.4 s** (one-time); steady-state **median
RTF ≈ 0.26** (≈3.8× faster than real time), flat from 6 to 152 characters
(0.25–0.27). Output is float32 mono @ **24 kHz**. Comfortable headroom to move to
1.7B later. (First-ever run also pays a ~75 s one-time model download.) These are
the empirical basis for a future ADR on backend/model choice.

**Two real dependency snags, both pinned honestly:**
- `mlx-audio 0.4.4` *requires* `transformers>=5.5`, but the `mlx-lm 0.31.3` it
  bundles calls `AutoTokenizer.register("NewlineTokenizer", …)` in a way
  `transformers 5.13.0` rejects (stricter `register`). Capped `transformers>=5.5,<5.13`
  in the mlx extra; resolves to 5.12.1, which works.
- The MLX stack is a **macOS-only extra**, so `import mlx_audio` is **deferred**
  inside `MlxTTSBackend._ensure_model` and the factory only imports the module
  when `mlx` is selected — `app.backends` stays importable on CI/linux. The MLX
  test is double-gated (`importorskip` + `RUN_MLX_TESTS=1`) so neither CI nor a
  plain `uv run pytest` ever downloads a model.

**Lazy + serialized.** The model loads on the first `/synthesize` (server boots
instantly, `/health` works meanwhile), memoized under a load lock; generate runs
under a separate lock since MLX eval isn't concurrency-safe — correct and enough
for a local single user.

**Follow-up — Base → CustomVoice (the voice changed every utterance).** First
real use surfaced a wrong model pick: with `0.6B-Base-8bit` the voice was a
*different speaker every Speak*. Qwen3-TTS `Base` is the voice-*cloning*
foundation — it has no trained speakers, so `voice="…"` is just a free label and
temperature-0.9 sampling invents a new speaker each generation (cloning needs a
`ref_audio`). The multi-speaker variant is **CustomVoice**, which conditions on a
fixed named-speaker embedding and *validates* the name. Switched the default to
`0.6B-CustomVoice-8bit`, voice `serena` (Base had silently accepted the invalid
`Chelsie`; CustomVoice's speaker set is serena/vivian/uncle_fu/ryan/aiden/
ono_anna/sohee/eric/dylan). Verified stable: the same text twice gives a matching
spectral centroid (~2000 Hz) = same identity. Same size/quant, so the measured
RTF above still holds. The env seam made this a one-line default change, no code.

## 2026-07-08 — Voice + language selection, provider-advertised (ADR-004 2b follow-up)

**Made the picker tell the truth per provider.** The voice `<select>` was
hardcoded to Kokoro voices and disabled in server mode, and there was no language
control — even though the MLX model already exposes `model.supported_speakers`
(serena/vivian/uncle_fu/ryan/aiden/ono_anna/sohee/eric/dylan) and
`model.supported_languages` (auto/english/italian/german/spanish/portuguese/
french/russian/chinese/japanese/korean). Rather than duplicate those lists in
`/web`, the **provider advertises capabilities**: added `getCapabilities()` to the
`TTSProvider` seam (ADR-001) and a `GET /capabilities` endpoint that returns the
active backend's `voices()`/`languages()` (introspected from the loaded model, so
it's correct for whatever model is configured). `BrowserTTSProvider` returns the
Kokoro voices (grouped, no language control — Kokoro's language rides on the
voice); `ServerTTSProvider` fetches `/capabilities`. `TTSOptions` gained
`language` (default `auto`). The MLX backend now validates a requested
voice/language against the model's sets and falls back to its default rather than
500-ing on a stale value (which is how the earlier Kokoro-`af_heart` leak
surfaced). Italian etc. are now reachable from the UI — the ADR-004 multilingual
goal, live.

**RTF on both CustomVoice models — measured on THIS M4 Pro (24 GB), no third-party
numbers.** Same 4-text bench, steady-state median RTF (load+warmup excluded):

| model | load+warmup | median RTF | vs real-time |
|-------|-------------|-----------|--------------|
| 0.6B-CustomVoice-8bit (default) | ~1.4 s | **0.25** | ~3.9× faster |
| 1.7B-CustomVoice-8bit | ~2.1 s | **0.32** | ~3.1× faster |

The 1.7B is ~25 % slower but still ~3× faster than real time — quality upgrade is
viable whenever wanted (a one-line `MLX_TTS_MODEL` change). Kept **0.6B as the
default** and deleted the 1.7B from the HF cache after benching (per the
"benchmark then clean" intent). These supersede the single-model note above and
are the empirical basis for a future model-choice ADR.

## 2026-07-08 — Instruct (voice-tone) box, gated on real model capability

Qwen3-TTS CustomVoice/VoiceDesign models take an `instruct` prompt (tone/style,
e.g. "cheerful and energetic"). Wired it through the same capabilities seam:
`TTSBackend.supports_instruct()`, surfaced on `/capabilities` as `instruct: bool`
and on `TTSCapabilities.supportsInstruct`; `TTSPanel` shows a "Voice tone" text
box **only when the provider reports support**. `TTSOptions.instruct` flows
web → `/synthesize` → `model.generate(instruct=…)`.

The gate is honest, not cosmetic: it mirrors mlx-audio's own rule —
`voice_design` → always; `custom_voice` → only when `tts_model_size != "0b6"`
(the 0.6B build silently drops instruct); Base → never. So **the default
0.6B-CustomVoice reports `false` and shows no box** — correct behavior, not a
bug. Verified both ways on this machine: 0.6B → `instruct:false`, no box, Speak
still works; re-downloaded 1.7B-CustomVoice → `instruct:true`, box appears, and
"very happy" vs "very angry" on the same text/voice produce **different audio**
(103 KB vs 134 KB) — the prompt genuinely changes delivery. Then deleted the
1.7B again (0.6B stays default). The MLX backend only forwards `instruct` when
`supports_instruct()`, so an unsupported model is never fed a stray prompt.
