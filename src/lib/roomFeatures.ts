import { supabase } from "@/lib/supabase";

export type Wall = "top" | "right" | "bottom" | "left";
export type FeatureType = "door" | "window";
/** A door or window; `position` is how far along its wall, from 0 to 1. */
export type RoomFeature = { id: string; type: FeatureType; wall: Wall; position: number };

export const FEATURE_TYPES: { value: FeatureType; label: string }[] = [
  { value: "door", label: "Door" },
  { value: "window", label: "Window" },
];

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

export function fetchRoomFeatures(householdId: string, roomId: string) {
  return supabase
    .from("room_features")
    .select("id, type, wall, position")
    .eq("household_id", householdId)
    .eq("room_id", roomId)
    .order("created_at")
    .returns<RoomFeature[]>();
}

/** New features start in the middle of their wall. */
export function insertRoomFeature(
  householdId: string,
  roomId: string,
  type: FeatureType,
  wall: Wall,
) {
  return supabase
    .from("room_features")
    .insert({ household_id: householdId, room_id: roomId, type, wall, position: 0.5 });
}

export function saveFeaturePosition(id: string, position: number) {
  return supabase.from("room_features").update({ position }).eq("id", id);
}

export function deleteRoomFeature(id: string) {
  return supabase.from("room_features").delete().eq("id", id);
}
