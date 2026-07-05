/**
 * darken — scales a `#rrggbb` color's channels toward black by `factor`
 * (0 = black, 1 = unchanged). Pure/DOM-free so it's unit-testable on its own,
 * same spirit as headMorphController.ts and wawaLipsync.ts's encodeWav.
 *
 * Used to derive the wireframe color from the single user-picked point color
 * (see store/appearanceStore.ts) instead of asking for two separate pickers.
 */
export function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const scale = (channel: number) =>
    Math.round(Math.min(255, Math.max(0, channel * factor)))
      .toString(16)
      .padStart(2, '0')

  return `#${scale(r)}${scale(g)}${scale(b)}`
}
