import { Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type LocationLevel,
  ROOM_PRESETS,
  UNIT_TYPES,
  levelLabel,
  unitTypeLabel,
} from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export type LocationRow = {
  id: string;
  name: string;
  level: LocationLevel;
  unit_type: string | null;
};

export function LocationList({
  householdId,
  parentId,
  level,
  onSelect,
}: {
  householdId: string;
  parentId: string | null;
  level: LocationLevel;
  onSelect: (location: LocationRow) => void;
}) {
  const [rows, setRows] = useState<LocationRow[] | "loading">("loading");
  const [error, setError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    let query = supabase
      .from("locations")
      .select("id, name, level, unit_type")
      .eq("household_id", householdId)
      .eq("level", level)
      .order("created_at");

    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      return;
    }
    setRows(data);
  }, [householdId, parentId, level]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  if (error) {
    return <p className="text-destructive p-4 text-sm">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {rows === "loading" ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No {levelLabel(level).toLowerCase()}s yet.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((row) => {
            const typeLabel = unitTypeLabel(row.unit_type);
            return (
              <li key={row.id} className="flex items-center gap-1 px-2 py-1">
                {renamingId === row.id ? (
                  <RenameForm
                    row={row}
                    onDone={() => {
                      setRenamingId(null);
                      fetchRows();
                    }}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className={cn(
                        "flex flex-1 items-center justify-between px-2 py-2 text-left text-sm",
                        row.unit_type === "nounit" && "text-muted-foreground",
                      )}
                    >
                      <span>{row.name}</span>
                      {typeLabel && (
                        <span className="text-muted-foreground text-xs">
                          {typeLabel}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${row.name}`}
                      onClick={() => setRenamingId(row.id)}
                      className="text-muted-foreground p-2"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {level === "room" && (
        <RoomPresets householdId={householdId} onCreated={fetchRows} />
      )}

      <AddLocationForm
        householdId={householdId}
        parentId={parentId}
        level={level}
        onCreated={fetchRows}
      />
    </div>
  );
}

function RenameForm({
  row,
  onDone,
}: {
  row: LocationRow;
  onDone: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    const { error } = await supabase
      .from("locations")
      .update({ name })
      .eq("id", row.id);

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2 py-1">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoFocus
        required
      />
      <Button type="submit" size="sm" disabled={status === "saving"}>
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        Cancel
      </Button>
      {status === "error" && (
        <p className="text-destructive text-xs">{errorMessage}</p>
      )}
    </form>
  );
}

function RoomPresets({
  householdId,
  onCreated,
}: {
  householdId: string;
  onCreated: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function addRoom(name: string) {
    setPending(name);
    const { error } = await supabase.from("locations").insert({
      household_id: householdId,
      parent_id: null,
      level: "room",
      name,
    });
    setPending(null);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    onCreated();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">Quick add a room:</p>
      <div className="flex flex-wrap gap-2">
        {ROOM_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={pending === preset}
            onClick={() => addRoom(preset)}
            className="rounded-full border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {pending === preset ? "Adding..." : preset}
          </button>
        ))}
      </div>
      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}

function AddLocationForm({
  householdId,
  parentId,
  level,
  onCreated,
}: {
  householdId: string;
  parentId: string | null;
  level: LocationLevel;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const { error } = await supabase.from("locations").insert({
      household_id: householdId,
      parent_id: parentId,
      level,
      name,
      ...(level === "unit" ? { unit_type: unitType } : {}),
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setName("");
    setUnitType("");
    setStatus("idle");
    onCreated();
  }

  const needsUnitType = level === "unit";
  const canSubmit = name.trim() !== "" && (!needsUnitType || unitType !== "");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {level === "room" && (
        <p className="text-muted-foreground text-sm">Or add a custom room:</p>
      )}
      <Input
        placeholder={`${levelLabel(level)} name`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      {needsUnitType && (
        <Select value={unitType} onValueChange={(value) => setUnitType(value ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="What kind of furniture?" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="submit" disabled={status === "saving" || !canSubmit}>
        {status === "saving" ? "Adding..." : `Add ${levelLabel(level).toLowerCase()}`}
      </Button>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}
