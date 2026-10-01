import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationRow } from "@/components/LocationList";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unitTypeIcon, unitTypeLabel } from "@/lib/locations";
import {
  FEATURE_EMOJI,
  FEATURE_TYPES,
  type FeatureType,
  WALLS,
  type Wall,
  wallLabel,
} from "@/lib/roomFeatures";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PlanUnit = LocationRow & { canvas_x: number | null; canvas_y: number | null };
type RoomFeature = { id: string; type: FeatureType; wall: Wall; position: number };

const CARD_SIZE = 64;
const GRID_GAP = 12;
const COLUMNS = 3;
const DRAG_THRESHOLD = 4;
const MARKER_LENGTH = 28;
const MARKER_THICKNESS = 10;

function defaultPosition(index: number) {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    x: col * (CARD_SIZE + GRID_GAP) + GRID_GAP,
    y: row * (CARD_SIZE + GRID_GAP) + GRID_GAP,
  };
}

export function RoomPlan({
  householdId,
  roomId,
  onOpenUnit,
}: {
  householdId: string;
  roomId: string;
  onOpenUnit: (unit: LocationRow) => void;
}) {
  const [units, setUnits] = useState<PlanUnit[] | "loading">("loading");
  const [features, setFeatures] = useState<RoomFeature[] | "loading">("loading");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnits = useCallback(async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, level, unit_type, canvas_x, canvas_y")
      .eq("household_id", householdId)
      .eq("level", "unit")
      .eq("parent_id", roomId)
      .neq("unit_type", "nounit")
      .order("created_at")
      .returns<PlanUnit[]>();

    if (error) {
      setError(error.message);
      return;
    }
    setUnits(data);
  }, [householdId, roomId]);

  const fetchFeatures = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_features")
      .select("id, type, wall, position")
      .eq("household_id", householdId)
      .eq("room_id", roomId)
      .order("created_at")
      .returns<RoomFeature[]>();

    if (error) {
      setError(error.message);
      return;
    }
    setFeatures(data);
  }, [householdId, roomId]);

  useEffect(() => {
    fetchUnits();
    fetchFeatures();
  }, [fetchUnits, fetchFeatures]);

  async function handlePersistFeaturePosition(id: string, position: number) {
    await supabase.from("room_features").update({ position }).eq("id", id);
  }

  async function handleDeleteFeature(id: string) {
    await supabase.from("room_features").delete().eq("id", id);
    fetchFeatures();
  }

  if (error) {
    return <p className="text-destructive p-4 text-sm">{error}</p>;
  }

  if (units === "loading" || features === "loading") {
    return <p className="text-muted-foreground p-4 text-sm">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {units.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No furniture yet — add a unit from the List view first, then arrange
          it here.
        </p>
      )}
      <div
        ref={containerRef}
        className="bg-muted/20 relative mx-auto aspect-square w-full max-w-sm border-2"
      >
        {units.map((unit, index) => (
          <FurnitureCard
            key={unit.id}
            unit={unit}
            index={index}
            containerRef={containerRef}
            onOpen={() => onOpenUnit(unit)}
          />
        ))}
        {features.map((feature) => (
          <WallFeatureMarker
            key={feature.id}
            feature={feature}
            containerRef={containerRef}
            onPersist={handlePersistFeaturePosition}
          />
        ))}
      </div>

      <AddFeatureForm
        householdId={householdId}
        roomId={roomId}
        onCreated={fetchFeatures}
      />

      {features.length > 0 && (
        <ul className="divide-y rounded-md border">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>
                {FEATURE_EMOJI[feature.type]}{" "}
                {feature.type === "door" ? "Door" : "Window"} (
                {wallLabel(feature.wall)})
              </span>
              <button
                type="button"
                aria-label={`Remove ${feature.type}`}
                onClick={() => handleDeleteFeature(feature.id)}
                className="text-muted-foreground px-2"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FurnitureCard({
  unit,
  index,
  containerRef,
  onOpen,
}: {
  unit: PlanUnit;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpen: () => void;
}) {
  const fallback = defaultPosition(index);
  const [pos, setPos] = useState({
    x: unit.canvas_x ?? fallback.x,
    y: unit.canvas_y ?? fallback.y,
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    maxX: number;
    maxY: number;
  } | null>(null);

  const Icon = unitTypeIcon(unit.unit_type);

  function handlePointerDown(event: React.PointerEvent) {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const bounds = containerRef.current?.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
      maxX: (bounds?.width ?? CARD_SIZE) - CARD_SIZE,
      maxY: (bounds?.height ?? CARD_SIZE) - CARD_SIZE,
    };
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      drag.moved = true;
    }
    setPos({
      x: Math.min(Math.max(0, drag.originX + dx), Math.max(0, drag.maxX)),
      y: Math.min(Math.max(0, drag.originY + dy), Math.max(0, drag.maxY)),
    });
  }

  async function handlePointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag) return;

    if (!drag.moved) {
      onOpen();
      return;
    }

    await supabase
      .from("locations")
      .update({ canvas_x: pos.x, canvas_y: pos.y })
      .eq("id", unit.id);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ left: pos.x, top: pos.y, width: CARD_SIZE, height: CARD_SIZE }}
      title={unitTypeLabel(unit.unit_type) ?? unit.name}
      className={cn(
        "bg-card absolute flex touch-none flex-col items-center justify-center gap-0.5 rounded-md border p-1 text-center select-none",
        dragging && "z-10 shadow-md",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="w-full truncate text-[10px] leading-tight">
        {unit.name}
      </span>
    </div>
  );
}

function WallFeatureMarker({
  feature,
  containerRef,
  onPersist,
}: {
  feature: RoomFeature;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPersist: (id: string, position: number) => void;
}) {
  const [position, setPosition] = useState(feature.position);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ start: number; originPosition: number; length: number } | null>(
    null,
  );

  const horizontal = feature.wall === "top" || feature.wall === "bottom";

  function handlePointerDown(event: React.PointerEvent) {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const bounds = containerRef.current?.getBoundingClientRect();
    dragRef.current = {
      start: horizontal ? event.clientX : event.clientY,
      originPosition: position,
      length: (horizontal ? bounds?.width : bounds?.height) ?? 1,
    };
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const current = horizontal ? event.clientX : event.clientY;
    const delta = current - drag.start;
    const deltaFraction = drag.length > 0 ? delta / drag.length : 0;
    setPosition(Math.min(1, Math.max(0, drag.originPosition + deltaFraction)));
  }

  function handlePointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    onPersist(feature.id, position);
  }

  const style: React.CSSProperties = horizontal
    ? {
        width: MARKER_LENGTH,
        height: MARKER_THICKNESS,
        left: `calc(${position * 100}% - ${MARKER_LENGTH / 2}px)`,
        top: feature.wall === "top" ? -MARKER_THICKNESS / 2 : undefined,
        bottom: feature.wall === "bottom" ? -MARKER_THICKNESS / 2 : undefined,
      }
    : {
        width: MARKER_THICKNESS,
        height: MARKER_LENGTH,
        top: `calc(${position * 100}% - ${MARKER_LENGTH / 2}px)`,
        left: feature.wall === "left" ? -MARKER_THICKNESS / 2 : undefined,
        right: feature.wall === "right" ? -MARKER_THICKNESS / 2 : undefined,
      };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={style}
      title={feature.type === "door" ? "Door" : "Window"}
      className={cn(
        "absolute touch-none rounded-sm select-none",
        feature.type === "door" ? "bg-amber-600" : "bg-sky-400",
        dragging && "z-10",
      )}
    />
  );
}

function AddFeatureForm({
  householdId,
  roomId,
  onCreated,
}: {
  householdId: string;
  roomId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState<FeatureType>("door");
  const [wall, setWall] = useState<Wall>("top");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAdd() {
    setStatus("saving");
    const { error } = await supabase.from("room_features").insert({
      household_id: householdId,
      room_id: roomId,
      type,
      wall,
      position: 0.5,
    });
    setStatus("idle");
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }
    onCreated();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">Add a door or window:</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={type}
          onValueChange={(v) => setType((v as FeatureType) || "door")}
          items={FEATURE_TYPES}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="door">Door</SelectItem>
            <SelectItem value="window">Window</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={wall}
          onValueChange={(v) => setWall((v as Wall) || "top")}
          items={WALLS}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WALLS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleAdd} disabled={status === "saving"}>
          {status === "saving" ? "Adding..." : "Add"}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}
