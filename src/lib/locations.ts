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
