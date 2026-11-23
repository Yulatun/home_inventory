import { useSavedDrag } from "@/hooks/useSavedDrag";
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
 * (saved when the drag ends), or tap it to open it. Save failures are
 * handled as described on useSavedDrag.
 */
export function usePlanCard({
  location,
  index,
  size,
  containerRef,
  onOpen,
  onSaveError,
}: {
  location: PlanLocation;
  index: number;
  size: Size;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpen: () => void;
  onSaveError: (message: string) => void;
}) {
  const fallback = defaultGridPosition(index, size);

  const { value: pos, dragging, handlers } = useSavedDrag({
    initial: { x: location.canvas_x ?? fallback.x, y: location.canvas_y ?? fallback.y },
    measure: () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      return {
        maxX: (bounds?.width ?? size.width) - size.width,
        maxY: (bounds?.height ?? size.height) - size.height,
      };
    },
    apply: (start, { dx, dy }, { maxX, maxY }) => ({
      x: clamp(start.x + dx, maxX),
      y: clamp(start.y + dy, maxY),
    }),
    save: (position) => saveCanvasPosition(location.id, position),
    onTap: onOpen,
    onSaveError,
  });

  return { pos, dragging, handlers };
}
