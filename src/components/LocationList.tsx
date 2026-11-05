import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddLocationForm } from "@/components/AddLocationForm";
import { DeleteConfirm, RenameForm } from "@/components/LocationRowActions";
import { type Preset, PresetChips } from "@/components/PresetChips";
import { friendlyError } from "@/lib/errors";
import {
  type LocationLevel,
  type LocationRow,
  NO_SHELF_TAKEN,
  ROOM_PRESETS,
  SHELF_PRESETS,
  UNIT_PRESETS,
  insertLocation,
  levelLabel,
  unitTypeLabel,
} from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const asPresets = (names: readonly string[]): Preset[] =>
  names.map((name) => ({ value: name, label: name }));

// Boxes have no presets. A unit preset's value is its unit_type; a room or
// shelf preset's value is just its name.
const PRESETS_BY_LEVEL: Partial<Record<LocationLevel, readonly Preset[]>> = {
  room: asPresets(ROOM_PRESETS),
  unit: UNIT_PRESETS,
  shelf: asPresets(SHELF_PRESETS),
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
  const [activeAction, setActiveAction] = useState<
    { id: string; type: "rename" | "delete" } | null
  >(null);

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
      setError(friendlyError(error));
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
                {activeAction?.id === row.id && activeAction.type === "rename" ? (
                  <RenameForm
                    row={row}
                    onDone={() => {
                      setActiveAction(null);
                      fetchRows();
                    }}
                  />
                ) : activeAction?.id === row.id && activeAction.type === "delete" ? (
                  <DeleteConfirm
                    row={row}
                    onCancel={() => setActiveAction(null)}
                    onDone={() => {
                      setActiveAction(null);
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
                      onClick={() => setActiveAction({ id: row.id, type: "rename" })}
                      className="text-muted-foreground p-2"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${row.name}`}
                      onClick={() => setActiveAction({ id: row.id, type: "delete" })}
                      className="text-muted-foreground p-2"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <LevelPresets
        householdId={householdId}
        parentId={parentId}
        level={level}
        onCreated={fetchRows}
      />

      <AddLocationForm
        householdId={householdId}
        parentId={parentId}
        level={level}
        onCreated={fetchRows}
      />
    </div>
  );
}

/** Quick-add chips for the levels that have presets (rooms, units, shelves). */
function LevelPresets({
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
  const presets = PRESETS_BY_LEVEL[level];
  if (!presets) return null;

  return (
    <PresetChips
      title={`Quick add a ${levelLabel(level).toLowerCase()}:`}
      presets={presets}
      create={(preset) =>
        insertLocation(householdId, parentId, level, preset.label, preset.value)
      }
      duplicateMessage={level === "shelf" ? NO_SHELF_TAKEN : undefined}
      onCreated={onCreated}
    />
  );
}
