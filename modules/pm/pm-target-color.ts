function pmTargetPalette(targetId: string) {
  let hash = 2166136261;
  for (const char of targetId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const value = hash >>> 0;
  const hue = value % 360;
  const saturation = 62 + ((value >>> 9) % 16);
  const lightness = 92 + ((value >>> 17) % 4);
  return { hue, saturation, lightness };
}

export function pmTargetColor(targetId: string) {
  const { hue, saturation, lightness } = pmTargetPalette(targetId);
  return {
    backgroundColor: "hsl(" + hue + " " + saturation + "% " + lightness + "%)",
    borderColor: "hsl(" + hue + " " + saturation + "% 50%)",
    color: "hsl(" + hue + " 70% 23%)",
  };
}

export function pmTargetGlowColor(targetId: string) {
  const { hue, saturation } = pmTargetPalette(targetId);
  return "hsl(" + hue + " " + saturation + "% 58% / 0.52)";
}
