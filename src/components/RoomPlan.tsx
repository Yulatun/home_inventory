import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationRow } from "@/components/LocationList";
import { unitTypeIcon, unitTypeLabel } from "@/lib/locations";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PlanUnit = LocationRow & { canvas_x: number | null; canvas_y: number | null };

const CARD_SIZE = 64;
const GRID_GAP = 12;
const COLUMNS = 3;
const DRAG_THRESHOLD = 4;

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

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  if (error) {
    return <p className="text-destructive p-4 text-sm">{error}</p>;
  }

  if (units === "loading") {
    return <p className="text-muted-foreground p-4 text-sm">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-2 p-4">
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
      </div>
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
