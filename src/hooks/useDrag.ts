import { useRef, useState } from "react";

// Pointer movement below this many pixels still counts as a tap, not a drag.
const DRAG_THRESHOLD = 4;

type Delta = { dx: number; dy: number };

/**
 * Pointer drag for floor-plan items. `start` captures whatever the item needs
 * to remember when the drag begins (its starting position, the container
 * size); `move` gets the distance moved since then; `end` learns whether the
 * pointer actually moved, so a tap can open the item instead.
 * Spread `handlers` on the dragged element (which needs `touch-none`).
 */
export function useDrag<Origin>({
  start,
  move,
  end,
}: {
  start: () => Origin;
  move: (delta: Delta, origin: Origin) => void;
  end: (moved: boolean) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; origin: Origin; moved: boolean } | null>(
    null,
  );

  function onPointerDown(event: React.PointerEvent) {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, origin: start(), moved: false };
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      drag.moved = true;
    }
    move({ dx, dy }, drag.origin);
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (drag) end(drag.moved);
  }

  return { dragging, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
