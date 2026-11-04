import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type LocationLevel, UNIT_TYPES } from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";

const UNIT_PRESETS = UNIT_TYPES.filter((type) => type.value !== "other");

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
  // Set when a unit is created from here, so its auto-created "No Shelf"
  // gets selected and the item can be saved without another tap.
  const pickOnlyShelf = useRef(false);
  const [loadError, setLoadError] = useState("");
  const showLoadError = (error: { message: string; code?: string }) =>
    setLoadError(friendlyError(error));

  useEffect(() => {
    setLoadError("");
    fetchChildren(householdId, null, "room").then(setRooms, showLoadError);
  }, [householdId]);

  useEffect(() => {
    setUnitId(null);
    setUnits("loading");
    if (!roomId) return;
    setLoadError("");
    fetchChildren(householdId, roomId, "unit").then(setUnits, showLoadError);
  }, [householdId, roomId]);

  useEffect(() => {
    setShelfId(null);
    setShelves("loading");
    if (!unitId) return;
    setLoadError("");
    fetchChildren(householdId, unitId, "shelf").then((rows) => {
      setShelves(rows);
      if (pickOnlyShelf.current && rows.length === 1) setShelfId(rows[0].id);
      pickOnlyShelf.current = false;
    }, showLoadError);
  }, [householdId, unitId]);

  function handleUnitCreated(unit: Option) {
    setUnits((prev) => (prev === "loading" ? [unit] : [...prev, unit]));
    pickOnlyShelf.current = true;
    setUnitId(unit.id);
  }

  useEffect(() => {
    setBoxId(null);
    setBoxes("loading");
    if (!shelfId) return;
    setLoadError("");
    fetchChildren(householdId, shelfId, "box").then(setBoxes, showLoadError);
  }, [householdId, shelfId]);

  useEffect(() => {
    onChange(boxId ?? shelfId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxId, shelfId]);

  return (
    <div className="flex flex-col gap-3">
      {loadError && <p className="text-destructive text-sm">{loadError}</p>}
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
      {roomId && units !== "loading" && (
        <NewUnit householdId={householdId} roomId={roomId} onCreated={handleUnitCreated} />
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

/** Lets the user add a missing unit to the chosen room without leaving the item form. */
function NewUnit({
  householdId,
  roomId,
  onCreated,
}: {
  householdId: string;
  roomId: string;
  onCreated: (unit: Option) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Disabling the buttons doesn't stop Enter in the name box, so guard here
  // too. A ref, not the state, so two quick presses can't both get through.
  const inFlight = useRef(false);

  /** Returns whether the unit was created, so callers keep the user's input otherwise. */
  async function create(name: string, unitType: string): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    setCreating(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("locations")
      .insert({
        household_id: householdId,
        parent_id: roomId,
        level: "unit",
        name,
        unit_type: unitType,
      })
      .select("id, name")
      .single();
    inFlight.current = false;
    setCreating(false);

    if (error) {
      setErrorMessage(friendlyError(error));
      return false;
    }
    onCreated(data);
    return true;
  }

  async function handleAddCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (await create(trimmed, "other")) setCustomName("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-sm">Not listed? Add a unit:</p>
      <div className="flex flex-wrap gap-2">
        {UNIT_PRESETS.map((type) => (
          <button
            key={type.value}
            type="button"
            disabled={creating}
            onClick={() => create(type.label, type.value)}
            className="text-muted-foreground rounded-full border border-dashed px-3 py-1.5 text-sm disabled:opacity-50"
          >
            + {type.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Or type a unit name"
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          onKeyDown={(event) => {
            // This sits inside the item form; Enter should add the unit, not the item.
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddCustom}
          disabled={creating || customName.trim() === ""}
        >
          Add
        </Button>
      </div>
      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
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
