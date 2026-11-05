import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type LocationLevel, UNIT_PRESETS, insertUnit } from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";

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
  // The unit just created from here, so its auto-created "No Shelf" gets
  // selected and the item can be saved without another tap, and so a units
  // fetch that read the table before the insert still lists it.
  const createdUnit = useRef<{ unit: Option; roomId: string } | null>(null);
  // Read by handleUnitCreated, which runs after an await and so can't trust
  // the roomId captured when the insert started.
  const currentRoomId = useRef<string | null>(null);
  const [loadError, setLoadError] = useState("");

  /**
   * Fetches one level and hands the rows to `onRows`, unless the selection
   * changed meanwhile: then the result is stale and dropped, so a slow answer
   * for a previous room/unit/shelf can't overwrite or pre-select the current one.
   * Returns the effect cleanup that marks it stale.
   */
  function loadLevel(
    parentId: string | null,
    level: LocationLevel,
    onRows: (rows: Option[]) => void,
  ) {
    let stale = false;
    setLoadError("");
    fetchChildren(householdId, parentId, level).then(
      (rows) => {
        if (!stale) onRows(rows);
      },
      (error) => {
        if (!stale) setLoadError(friendlyError(error));
      },
    );
    return () => {
      stale = true;
    };
  }

  useEffect(() => {
    return loadLevel(null, "room", setRooms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  useEffect(() => {
    currentRoomId.current = roomId;
    setUnitId(null);
    setUnits("loading");
    if (!roomId) return;
    return loadLevel(roomId, "unit", (rows) => {
      const created = createdUnit.current;
      const missing =
        created?.roomId === roomId && !rows.some((row) => row.id === created.unit.id);
      setUnits(missing ? [...rows, created.unit] : rows);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, roomId]);

  useEffect(() => {
    setShelfId(null);
    setShelves("loading");
    if (!unitId) return;
    return loadLevel(unitId, "shelf", (rows) => {
      setShelves(rows);
      if (createdUnit.current?.unit.id === unitId) {
        createdUnit.current = null;
        if (rows.length === 1) setShelfId(rows[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, unitId]);

  function handleUnitCreated(unit: Option, forRoomId: string) {
    // The user switched room while the insert was running: the unit exists in
    // the room it was made for, but it doesn't belong in this room's list.
    if (forRoomId !== currentRoomId.current) return;
    // A units fetch for this room may already have listed it (after switching
    // away and back mid-insert), so don't add it twice.
    setUnits((prev) => {
      if (prev === "loading") return [unit];
      return prev.some((u) => u.id === unit.id) ? prev : [...prev, unit];
    });
    createdUnit.current = { unit, roomId: forRoomId };
    setUnitId(unit.id);
  }

  useEffect(() => {
    setBoxId(null);
    setBoxes("loading");
    if (!shelfId) return;
    return loadLevel(shelfId, "box", setBoxes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Keyed by room so a typed name or error never carries over to another room.
        <NewUnit
          key={roomId}
          householdId={householdId}
          roomId={roomId}
          onCreated={handleUnitCreated}
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

/** Lets the user add a missing unit to the chosen room without leaving the item form. */
function NewUnit({
  householdId,
  roomId,
  onCreated,
}: {
  householdId: string;
  roomId: string;
  onCreated: (unit: Option, forRoomId: string) => void;
}) {
  // Collapsed by default: the chips would otherwise sit between the unit and
  // shelf lists and push the rest of the form down on a phone.
  const [open, setOpen] = useState(false);
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
    const { data, error } = await insertUnit(householdId, roomId, name, unitType);
    inFlight.current = false;
    setCreating(false);

    if (error) {
      setErrorMessage(friendlyError(error));
      return false;
    }
    setOpen(false);
    onCreated(data, roomId);
    return true;
  }

  function close() {
    setOpen(false);
    setCustomName("");
    setErrorMessage("");
  }

  async function handleAddCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (await create(trimmed, "other")) setCustomName("");
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground rounded-full border border-dashed px-3 py-1.5 text-sm"
        >
          + Add unit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Add a unit:</p>
        <button
          type="button"
          onClick={close}
          disabled={creating}
          className="text-muted-foreground text-sm underline disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
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
