import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocationLevel } from "@/lib/locations";
import { supabase } from "@/lib/supabase";

type Option = { id: string; name: string };

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

/** Picks a shelf or box (the only levels an item can attach to) via cascading selects. */
export function LocationPicker({
  householdId,
  onChange,
}: {
  householdId: string;
  onChange: (locationId: string | null) => void;
}) {
  const [rooms, setRooms] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [shelves, setShelves] = useState<Option[]>([]);
  const [boxes, setBoxes] = useState<Option[]>([]);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [boxId, setBoxId] = useState<string | null>(null);

  useEffect(() => {
    fetchChildren(householdId, null, "room").then(setRooms);
  }, [householdId]);

  useEffect(() => {
    setUnitId(null);
    setUnits([]);
    if (!roomId) return;
    fetchChildren(householdId, roomId, "unit").then(setUnits);
  }, [householdId, roomId]);

  useEffect(() => {
    setShelfId(null);
    setShelves([]);
    if (!unitId) return;
    fetchChildren(householdId, unitId, "shelf").then(setShelves);
  }, [householdId, unitId]);

  useEffect(() => {
    setBoxId(null);
    setBoxes([]);
    if (!shelfId) return;
    fetchChildren(householdId, shelfId, "box").then(setBoxes);
  }, [householdId, shelfId]);

  useEffect(() => {
    onChange(boxId ?? shelfId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxId, shelfId]);

  return (
    <div className="flex flex-col gap-2">
      <LevelSelect
        placeholder="Room"
        options={rooms}
        value={roomId}
        onChange={setRoomId}
      />
      {roomId && (
        <LevelSelect
          placeholder="Unit"
          options={units}
          value={unitId}
          onChange={setUnitId}
        />
      )}
      {unitId && (
        <LevelSelect
          placeholder="Shelf"
          options={shelves}
          value={shelfId}
          onChange={setShelfId}
        />
      )}
      {shelfId && boxes.length > 0 && (
        <LevelSelect
          placeholder="Box (optional)"
          options={boxes}
          value={boxId}
          onChange={setBoxId}
        />
      )}
    </div>
  );
}

function LevelSelect({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
