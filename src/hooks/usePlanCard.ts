import { useState } from "react";
import { useDrag } from "@/hooks/useDrag";
import { type PlanLocation, saveCanvasPosition } from "@/lib/locations";

const GRID_GAP = 12;
const COLUMNS = 3;

type Size = { width: number; height: number };

/** Where card number `index` sits until the user drags it: a 3-column grid. */
function defaultGridPosition(index: number, size: Size) {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    x: col * (size.width + GRID_GAP) + GRID_GAP,
    y: row * (size.height + GRID_GAP) + GRID_GAP,
  };
}

/** Keeps a coordinate between 0 and max (max below 0 means the card doesn't fit: pin to 0). */
function clamp(value: number, max: number) {
  return Math.min(Math.max(0, value), Math.max(0, max));
}

/**
 * A room or unit card on a floor plan: drag it to move it inside the plan
 * (saved when the drag ends), or tap it to open it.
 */
export function usePlanCard({
  location,
  index,
  size,
  containerRef,
  onOpen,
}: {
  location: PlanLocation;
  index: number;
  size: Size;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpen: () => void;
}) {
  const fallback = defaultGridPosition(index, size);
  const [pos, setPos] = useState({
    x: location.canvas_x ?? fallback.x,
    y: location.canvas_y ?? fallback.y,
  });

  const { dragging, handlers } = useDrag({
    start: () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      return {
        ...pos,
        maxX: (bounds?.width ?? size.width) - size.width,
        maxY: (bounds?.height ?? size.height) - size.height,
      };
    },
    move: ({ dx, dy }, origin) =>
      setPos({ x: clamp(origin.x + dx, origin.maxX), y: clamp(origin.y + dy, origin.maxY) }),
    end: (moved) => {
      if (moved) saveCanvasPosition(location.id, pos);
      else onOpen();
    },
  });

  return { pos, dragging, handlers };
}
