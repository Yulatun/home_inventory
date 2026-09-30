export type Wall = "top" | "right" | "bottom" | "left";
export type FeatureType = "door" | "window";

export const WALLS: { value: Wall; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
];

export const FEATURE_EMOJI: Record<FeatureType, string> = {
  door: "🚪",
  window: "🪟",
};

export function wallLabel(wall: Wall): string {
  return WALLS.find((w) => w.value === wall)?.label ?? wall;
}
