import { useRef, useState } from "react";
import type { Option } from "@/components/LevelButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { UNIT_PRESETS, insertLocation } from "@/lib/locations";

/** Lets the user add a missing unit to the chosen room without leaving the item form. */
export function NewUnit({
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
    const { data, error } = await insertLocation(householdId, roomId, "unit", name, unitType);
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
