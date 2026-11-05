import {
  Archive,
  Boxes,
  Box as BoxIcon,
  Inbox,
  type LucideIcon,
  Package,
  Package2,
  PackageOpen,
  Sofa,
  Table2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export type LocationLevel = "room" | "unit" | "shelf" | "box";

export const UNIT_TYPES = [
  { value: "wardrobe", label: "Wardrobe" },
  { value: "cupboard", label: "Cupboard" },
  { value: "couch", label: "Couch" },
  { value: "cabinet", label: "Cabinet" },
  { value: "drawer", label: "Drawer" },
  { value: "shelving_unit", label: "Shelving unit" },
  { value: "chest", label: "Chest" },
  { value: "desk", label: "Desk" },
  { value: "other", label: "Other" },
] as const;

/** Unit types offered as one-tap chips; "other" needs a name, so it's the custom box instead. */
export const UNIT_PRESETS = UNIT_TYPES.filter((type) => type.value !== "other");

export type LocationRow = {
  id: string;
  name: string;
  level: LocationLevel;
  unit_type: string | null;
};

// The only unique constraint adding or renaming a location can hit: one
// shelf named exactly "No Shelf" per unit (it's the auto-created placeholder).
export const NO_SHELF_TAKEN = 'This unit already has a "No Shelf". Pick a different name.';

/**
 * Adds a location — the one place the app inserts into `locations`. Database
 * triggers then add the defaults: a room's "No Unit", a unit's "No Shelf".
 */
export function insertLocation(
  householdId: string,
  parentId: string | null,
  level: LocationLevel,
  name: string,
  unitType?: string,
) {
  return supabase
    .from("locations")
    .insert({
      household_id: householdId,
      parent_id: parentId,
      level,
      name,
      ...(level === "unit" ? { unit_type: unitType } : {}),
    })
    .select("id, name")
    .single();
}

const UNIT_TYPE_ICONS: Record<string, LucideIcon> = {
  wardrobe: Archive,
  cupboard: Boxes,
  couch: Sofa,
  cabinet: Package2,
  drawer: Inbox,
  shelving_unit: PackageOpen,
  chest: Package,
  desk: Table2,
  other: BoxIcon,
};

export function unitTypeIcon(unitType: string | null): LucideIcon {
  return (unitType && UNIT_TYPE_ICONS[unitType]) || BoxIcon;
}

export const SHELF_PRESETS = [
  "Top Shelf",
  "Upper Shelf",
  "Middle Shelf",
  "Lower Shelf",
  "Bottom Shelf",
] as const;

export const ROOM_PRESETS = [
  "Bedroom",
  "Kitchen",
  "Living Room",
  "Bathroom",
  "Corridor",
  "Garage",
  "Basement",
  "Attic",
  "Balcony",
  "Office",
] as const;

const NEXT_LEVEL: Record<LocationLevel, LocationLevel | null> = {
  room: "unit",
  unit: "shelf",
  shelf: "box",
  box: null,
};

export function nextLevel(level: LocationLevel | null): LocationLevel | null {
  return level === null ? "room" : NEXT_LEVEL[level];
}

export function levelLabel(level: LocationLevel): string {
  switch (level) {
    case "room":
      return "Room";
    case "unit":
      return "Unit";
    case "shelf":
      return "Shelf";
    case "box":
      return "Box";
  }
}

export function unitTypeLabel(unitType: string | null): string | null {
  if (!unitType || unitType === "nounit") return null;
  return UNIT_TYPES.find((t) => t.value === unitType)?.label ?? unitType;
}
