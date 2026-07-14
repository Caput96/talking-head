import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Vector3,
} from 'three'
import { deriveEdgeIndices } from '../core/mesh-topology'
import { darken } from '../core/color'
import { useDebugStore } from '../store/debugStore'
import { useAppearanceStore } from '../store/appearanceStore'
import { getWawaLipsync } from './wawaLipsync'
import { HeadMorphController } from './headMorphController'
// `?url` asks Vite for the fingerprinted URL of the asset (see vite/client
// types) rather than inlining it — the GLB lives at the repo root, which Vite
// doesn't serve, so we hand this URL to useGLTF.
import headUrl from '../../assets/head.glb?url'

/**
 * HeadGLB — renders the custom GLB head (ADR-003) in the retro points+wireframe
 * style, with its 15 Oculus viseme morph targets preserved so the mouth can be
 * deformed by the vertex shader.
 *
 * This is the "morph-weight" animation path from ADR-003: it renders from the
 * GLB's own geometry and is animated ONLY by writing `morphTargetInfluences` —
 * it does NOT go through MorphEngine / the shared positions buffer (that path
 * still drives the parametric grid shapes). Keeping the two apart is the whole
 * point of the boundary in ADR-003.
 *
 * Two mouth drivers, mutually exclusive per frame:
 *  - Manual (Step 1): the VisemePanel slider (debugStore) drives one viseme
 *    weight by hand — how we first verified the exported morphs deform
 *    correctly, before any audio/lip-sync existed.
 *  - Live (Step 2/3): once TTSPanel has played at least one utterance through
 *    the wawa-lipsync bridge (head/wawaLipsync.ts), its live dominant viseme
 *    takes over every frame, eased across all 15 targets by
 *    HeadMorphController. This is a one-way handoff — see the useFrame below.
 */

// useGLTF caches parsed GLBs by URL; preload warms that cache at import time so
// the first render doesn't stall on parsing.
useGLTF.preload(headUrl)

// Wireframe/fill colors are derived from the user's chosen point color
// rather than picked separately — see store/appearanceStore.ts. Fill is
// darker than the wireframe so it reads as a dim base the wireframe/points
// visibly sit on top of, not one flat undifferentiated color.
const WIREFRAME_DARKEN_FACTOR = 0.45
const FILL_DARKEN_FACTOR = 0.25
const FIT_SIZE = 3 // target world size of the head's largest dimension
// The exported head's face points along local -X. The default camera looks down
// -Z (i.e. it sees the +Z side of things), so we rotate the head +90° about Y to
// bring the face round to +Z, toward the viewer. Applied on an OUTER group (see
// render) so it rotates about the origin the inner group already recentres on.
const FACING_Y = Math.PI / 2

export function HeadGLB({ showFill }: { showFill: boolean }) {
  // useGLTF returns the parsed scene graph. It's cached/stable, so the useMemo
  // below only runs once per distinct GLB.
  const { scene } = useGLTF(headUrl)

  const { points, line, occluder, position, scale } = useMemo(() => {
    // Find the mesh by traversing rather than by node name (`nodes['Plane.011']`),
    // so a re-export that renames the node can't silently break this.
    let mesh: Mesh | undefined
    scene.traverse((object) => {
      if (!mesh && (object as Mesh).isMesh) mesh = object as Mesh
    })
    if (!mesh) throw new Error('head.glb contains no mesh')

    const geometry = mesh.geometry

    // --- Points: one dot per vertex. ---
    // Passing geometry to the constructor lets Points.updateMorphTargets() set
    // up morphTargetInfluences immediately (geometry is present at construction).
    // transparent:true is deliberate even though opacity is 1: it moves the
    // points into three.js's transparent render pass, which runs AFTER opaque
    // objects. The occluder below is opaque, so by the time these points draw
    // its depth is already in the buffer and back-of-head points fail the depth
    // test and are hidden. As plain opaque objects they'd sort unstably against
    // the occluder and often draw first, before its depth existed — which is why
    // the toggle appeared to do nothing. Same reasoning as scene/Scene.tsx.
    // Seed from the store's current value (read once, imperatively — the
    // useEffect below keeps it in sync on every later change) rather than a
    // hardcoded color, so the geometry/materials aren't rebuilt just because
    // the user recolors the head.
    const pointsMaterial = new PointsMaterial({
      size: 0.04,
      color: useAppearanceStore.getState().color,
      sizeAttenuation: true,
      transparent: true,
    })
    const points = new Points(geometry, pointsMaterial)

    // GOTCHA: GLTFLoader writes the viseme *names* onto the loaded Mesh's
    // morphTargetDictionary, NOT onto the geometry's morph attributes. So the
    // dictionary our fresh Points just derived from the geometry is numeric
    // ("0".."14"). Copy the loaded mesh's NAMED dictionary so we can address a
    // target by "aa"/"oh"/... instead of a magic index. (The 15-zero
    // influences array Points built is fine to keep.)
    points.morphTargetDictionary = mesh.morphTargetDictionary

    // --- Wireframe: same vertices, drawn as edges. ---
    // A lightweight geometry that SHARES the position attribute and the morph
    // attributes (same objects, not copies) with the points, so both morph in
    // lockstep; only the index differs. deriveEdgeIndices() dedupes the triangle
    // index into unique edge pairs (reused from core/mesh-topology.ts).
    const wireGeometry = new BufferGeometry()
    wireGeometry.setAttribute('position', geometry.attributes.position)
    wireGeometry.morphAttributes.position = geometry.morphAttributes.position
    wireGeometry.morphTargetsRelative = geometry.morphTargetsRelative
    wireGeometry.setIndex(new BufferAttribute(deriveEdgeIndices(geometry.index!.array), 1))

    // transparent:true for the same render-pass reason as the points above.
    const lineMaterial = new LineBasicMaterial({
      color: darken(useAppearanceStore.getState().color, WIREFRAME_DARKEN_FACTOR),
      transparent: true,
    })
    const line = new LineSegments(wireGeometry, lineMaterial)
    // Point the wireframe at the SAME influences array + named dictionary as the
    // points, so writing a weight once (in useFrame) moves both together.
    line.morphTargetDictionary = points.morphTargetDictionary
    line.morphTargetInfluences = points.morphTargetInfluences

    // --- Occluder: real filled surface (the "Solid" toggle). ---
    // Reuses the head's own triangle geometry, drawn as a real flat-colored
    // surface — the far side of the head fails the depth test and stops
    // showing through the near side as a natural consequence of the surface
    // being opaque-ish, not via an invisible colorWrite:false trick. Same
    // approach as the buffer path (scene/Scene.tsx), but the head needs its
    // own since it renders outside MorphEngine. Shares the points'
    // influences/dictionary so it morphs in lockstep with the mouth.
    // DoubleSide avoids depending on triangle winding.
    const occluderMaterial = new MeshBasicMaterial({
      color: darken(useAppearanceStore.getState().color, FILL_DARKEN_FACTOR),
      side: DoubleSide,
      transparent: true,
    })
    const occluder = new Mesh(geometry, occluderMaterial)
    occluder.morphTargetDictionary = points.morphTargetDictionary
    occluder.morphTargetInfluences = points.morphTargetInfluences

    // --- Fit + recentre. ---
    // The exported head is ~5 units tall and offset from the origin, which would
    // overflow / sit off-centre for the default camera. A parent <group>
    // transform recentres it on its own bounding box and scales it to FIT_SIZE.
    // A group (parent) transform applies uniformly to the already-morphed
    // vertices, so it never interferes with the morph deltas themselves.
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    const scale = FIT_SIZE / Math.max(size.x, size.y, size.z)
    const position: [number, number, number] = [
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    ]

    return { points, line, occluder, position, scale }
  }, [scene])

  // Owns the eased 15-target weights for the live/audio-driven path. Created
  // once per mount so its smoothing state doesn't reset every frame.
  const morphController = useMemo(() => new HeadMorphController(), [])

  // Dispose the objects WE created on unmount (e.g. switching away from the
  // head). The shared GLTF geometry is owned by useGLTF's cache — don't touch
  // it — but the wireframe geometry and both materials are ours.
  useEffect(() => {
    return () => {
      line.geometry.dispose()
      ;(points.material as PointsMaterial).dispose()
      ;(line.material as LineBasicMaterial).dispose()
      ;(occluder.material as MeshBasicMaterial).dispose()
    }
  }, [points, line, occluder])

  // showVertices/color/opacity are discrete, user-driven changes (a click, a
  // color-picker drag) rather than 60fps data, so a normal reactive hook is
  // the right tool here — unlike the useFrame pull-model used for morph
  // weights below, which really does change every frame.
  const showVertices = useAppearanceStore((state) => state.showVertices)
  const color = useAppearanceStore((state) => state.color)
  const opacity = useAppearanceStore((state) => state.opacity)

  // pointsMaterial/lineMaterial/occluderMaterial are built once in the
  // useMemo above (so the geometry/morph wiring isn't redone on every color
  // tweak); this effect just mutates their existing color/opacity in place
  // when the store changes.
  useEffect(() => {
    const pointsMaterial = points.material as PointsMaterial
    const lineMaterial = line.material as LineBasicMaterial
    const occluderMaterial = occluder.material as MeshBasicMaterial
    pointsMaterial.color.set(color)
    lineMaterial.color.set(darken(color, WIREFRAME_DARKEN_FACTOR))
    occluderMaterial.color.set(darken(color, FILL_DARKEN_FACTOR))
    pointsMaterial.opacity = opacity
    lineMaterial.opacity = opacity
    occluderMaterial.opacity = opacity
  }, [points, line, occluder, color, opacity])

  // Pull model (same precedent as MorphEngine's positions buffer): read both
  // drivers imperatively each frame instead of subscribing.
  useFrame((_state, dt) => {
    const influences = points.morphTargetInfluences
    const dictionary = points.morphTargetDictionary
    if (!influences || !dictionary) return
    influences.fill(0)

    // getViseme() returns null only until the very first TTS utterance has
    // played through the wawa bridge — from then on it always returns a
    // viseme (silence included), so this handoff to the live driver is
    // permanent for the rest of the session once speech has started.
    const wawaViseme = getWawaLipsync().getViseme()
    if (wawaViseme !== null) {
      for (const [target, weight] of morphController.update(dt, wawaViseme)) {
        const index = dictionary[target]
        if (index !== undefined) influences[index] = weight
      }
    } else {
      const { debugViseme, debugWeight } = useDebugStore.getState()
      const index = dictionary[debugViseme]
      if (index !== undefined) influences[index] = debugWeight
    }

    // Dev-only observability: publish the current peak mouth influence so an
    // automated browser drive can confirm lip-sync is actually deforming the
    // mesh (there is no external handle on the R3F scene). Stripped from
    // production builds by the import.meta.env.DEV guard — same spirit as the
    // debugStore/VisemePanel dev harness that already exists for this mesh.
    if (import.meta.env.DEV) {
      let peak = 0
      for (const v of influences) if (v > peak) peak = v
      ;(globalThis as { __headMouthInfluence?: number }).__headMouthInfluence = peak
    }
  })

  // Outer group only rotates the head to face the camera; the inner group
  // recentres + scales it onto the origin. Splitting them matters: rotating the
  // *recentring* group would spin the head about the local origin and knock it
  // off-centre, because that group's own position offset isn't at the origin.
  return (
    <group rotation={[0, FACING_Y, 0]}>
      <group position={position} scale={scale}>
        {/* <primitive> drops an existing three.js object into the R3F scene graph
            as-is — we built Points/LineSegments imperatively above so their morph
            dictionaries were wired up with the geometry present. */}
        {showVertices && <primitive object={points} />}
        <primitive object={line} />
        {showFill && <primitive object={occluder} />}
      </group>
    </group>
  )
}
