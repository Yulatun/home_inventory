import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationRow } from "@/components/LocationList";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type PlanRoom = LocationRow & { canvas_x: number | null; canvas_y: number | null };

const CARD_WIDTH = 120;
const CARD_HEIGHT = 80;
const GRID_GAP = 16;
const COLUMNS = 3;
const DRAG_THRESHOLD = 4;

function defaultPosition(index: number) {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    x: col * (CARD_WIDTH + GRID_GAP) + GRID_GAP,
    y: row * (CARD_HEIGHT + GRID_GAP) + GRID_GAP,
  };
}

export function ApartmentPlan({
  householdId,
  onOpenRoom,
}: {
  householdId: string;
  onOpenRoom: (room: LocationRow) => void;
}) {
  const [rooms, setRooms] = useState<PlanRoom[] | "loading">("loading");
  const [error, setError] = useState("");

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, level, unit_type, canvas_x, canvas_y")
      .eq("household_id", householdId)
      .eq("level", "room")
      .order("created_at")
      .returns<PlanRoom[]>();

    if (error) {
      setError(error.message);
      return;
    }
    setRooms(data);
  }, [householdId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  if (error) {
    return <p className="text-destructive p-4 text-sm">{error}</p>;
  }

  if (rooms === "loading") {
    return <p className="text-muted-foreground p-4 text-sm">Loading...</p>;
  }

  if (rooms.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">No rooms yet.</p>;
  }

  return (
    <div
      className="relative h-full min-h-[500px] overflow-auto p-4"
      style={{
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {rooms.map((room, index) => (
        <RoomCard
          key={room.id}
          room={room}
          index={index}
          onOpen={() => onOpenRoom(room)}
        />
      ))}
    </div>
  );
}

function RoomCard({
  room,
  index,
  onOpen,
}: {
  room: PlanRoom;
  index: number;
  onOpen: () => void;
}) {
  const fallback = defaultPosition(index);
  const [pos, setPos] = useState({
    x: room.canvas_x ?? fallback.x,
    y: room.canvas_y ?? fallback.y,
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  function handlePointerDown(event: React.PointerEvent) {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
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
    setPos({ x: Math.max(0, drag.originX + dx), y: Math.max(0, drag.originY + dy) });
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
      .eq("id", room.id);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ left: pos.x, top: pos.y, width: CARD_WIDTH, height: CARD_HEIGHT }}
      className={cn(
        "bg-card absolute flex touch-none items-center justify-center rounded-md border p-2 text-center text-sm select-none",
        dragging && "z-10 shadow-md",
      )}
    >
      {room.name}
    </div>
  );
}
