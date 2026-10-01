import { useEffect, useState } from "react";
import type { LocationLevel } from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type Options = Option[] | "loading";

async function fetchChildren(
  householdId: string,
  parentId: string | null,
  level: LocationLevel,
): Promise<Option[]> {
  let query = supabase
    .from("locations")
    .select("id, name")
    .eq("household_id", householdId)
    .eq("level", level)
    .order("created_at");

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Picks a shelf or box (the only levels an item can attach to) via a few short tap-lists. */
export function LocationPicker({
  householdId,
  onChange,
}: {
  householdId: string;
  onChange: (locationId: string | null) => void;
}) {
  const [rooms, setRooms] = useState<Options>("loading");
  const [units, setUnits] = useState<Options>("loading");
  const [shelves, setShelves] = useState<Options>("loading");
  const [boxes, setBoxes] = useState<Options>("loading");

  const [roomId, setRoomId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [boxId, setBoxId] = useState<string | null>(null);

  useEffect(() => {
    fetchChildren(householdId, null, "room").then(setRooms);
  }, [householdId]);

  useEffect(() => {
    setUnitId(null);
    setUnits("loading");
    if (!roomId) return;
    fetchChildren(householdId, roomId, "unit").then(setUnits);
  }, [householdId, roomId]);

  useEffect(() => {
    setShelfId(null);
    setShelves("loading");
    if (!unitId) return;
    fetchChildren(householdId, unitId, "shelf").then(setShelves);
  }, [householdId, unitId]);

  useEffect(() => {
    setBoxId(null);
    setBoxes("loading");
    if (!shelfId) return;
    fetchChildren(householdId, shelfId, "box").then(setBoxes);
  }, [householdId, shelfId]);

  useEffect(() => {
    onChange(boxId ?? shelfId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxId, shelfId]);

  return (
    <div className="flex flex-col gap-3">
      <LevelButtons
        label="Room"
        emptyMessage="No rooms yet — add one from the Locations tab."
        options={rooms}
        value={roomId}
        onChange={setRoomId}
      />
      {roomId && (
        <LevelButtons
          label="Unit"
          emptyMessage="No units in this room."
          options={units}
          value={unitId}
          onChange={setUnitId}
        />
      )}
      {unitId && (
        <LevelButtons
          label="Shelf"
          emptyMessage="No shelves in this unit."
          options={shelves}
          value={shelfId}
          onChange={setShelfId}
        />
      )}
      {shelfId && Array.isArray(boxes) && boxes.length > 0 && (
        <LevelButtons
          label="Box (optional)"
          emptyMessage=""
          options={boxes}
          value={boxId}
          onChange={setBoxId}
        />
      )}
    </div>
  );
}

function LevelButtons({
  label,
  emptyMessage,
  options,
  value,
  onChange,
}: {
  label: string;
  emptyMessage: string;
  options: Options;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  if (options === "loading") {
    return (
      <p className="text-muted-foreground text-sm">Loading {label.toLowerCase()}s...</p>
    );
  }

  if (options.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-sm">{label}:</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              value === option.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background",
            )}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
