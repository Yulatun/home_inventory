import { useCallback, useEffect, useRef, useState } from "react";
import { usePlanCard } from "@/hooks/usePlanCard";
import { friendlyError } from "@/lib/errors";
import { type LocationRow, type PlanLocation, fetchPlanRooms } from "@/lib/locations";
import { cn } from "@/lib/utils";

const CARD_SIZE = { width: 96, height: 64 };

export function ApartmentPlan({
  householdId,
  onOpenRoom,
}: {
  householdId: string;
  onOpenRoom: (room: LocationRow) => void;
}) {
  const [rooms, setRooms] = useState<PlanLocation[] | "loading">("loading");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await fetchPlanRooms(householdId);
    if (error) {
      setError(friendlyError(error));
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
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No rooms yet — add one from the Locations tab.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-muted/20 relative mx-auto aspect-square w-full max-w-sm border-2"
    >
      {rooms.map((room, index) => (
        <RoomCard
          key={room.id}
          room={room}
          index={index}
          containerRef={containerRef}
          onOpen={() => onOpenRoom(room)}
        />
      ))}
    </div>
  );
}

/** A room on the apartment plan: drag to arrange, tap to open its own plan. */
function RoomCard({
  room,
  index,
  containerRef,
  onOpen,
}: {
  room: PlanLocation;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpen: () => void;
}) {
  const { pos, dragging, handlers } = usePlanCard({
    location: room,
    index,
    size: CARD_SIZE,
    containerRef,
    onOpen,
  });

  return (
    <div
      {...handlers}
      style={{ left: pos.x, top: pos.y, ...CARD_SIZE }}
      className={cn(
        "bg-card absolute flex touch-none items-center justify-center rounded-md border p-2 text-center text-sm select-none",
        dragging && "z-10 shadow-md",
      )}
    >
      {room.name}
    </div>
  );
}
