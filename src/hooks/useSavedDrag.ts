import { useRef, useState } from "react";
import { useDrag } from "@/hooks/useDrag";
import { friendlyError } from "@/lib/errors";

type Delta = { dx: number; dy: number };
type SaveResult = { error: { message: string; code?: string } | null };

/**
 * A floor-plan item whose position the user drags and the app saves:
 * - `measure` reads what the drag needs at its start (e.g. container size);
 * - `apply` turns the drag distance into the new position;
 * - `save` stores it when the drag ends; a tap calls `onTap` instead.
 * If a save fails, the item goes back to its last saved position and
 * `onSaveError` gets a message ("" after a successful save clears it).
 */
export function useSavedDrag<Value, Measured>({
  initial,
  measure,
  apply,
  save,
  onTap,
  onSaveError,
}: {
  initial: Value;
  measure: () => Measured;
  apply: (start: Value, delta: Delta, measured: Measured) => Value;
  save: (value: Value) => Promise<SaveResult>;
  onTap?: () => void;
  onSaveError: (message: string) => void;
}) {
  const [value, setValue] = useState(initial);
  // The value as last moved, read when saving: the state can be a render
  // behind if pointerup arrives before the last move has rendered.
  const latest = useRef(initial);
  // The last position the server confirmed: where a failed save goes back to.
  // `savedSeq` lets a late success still count, as long as no newer one did.
  const saved = useRef(initial);
  const savedSeq = useRef(0);
  // Numbers each save. Only the newest one may update `saved`, snap the item
  // back or report, so a slow older save can't undo or mislabel a newer move.
  const saveCount = useRef(0);
  // While the user is dragging, a failed save must not yank the item away;
  // the snap-back waits for the drag to end, in case it was only a tap.
  const dragActive = useRef(false);
  const revertAfterDrag = useRef(false);

  function show(next: Value) {
    latest.current = next;
    setValue(next);
  }

  const { dragging, handlers } = useDrag({
    start: () => {
      dragActive.current = true;
      return { value: latest.current, measured: measure() };
    },
    move: (delta, origin) => show(apply(origin.value, delta, origin.measured)),
    end: async (moved) => {
      dragActive.current = false;
      if (!moved) {
        if (revertAfterDrag.current) show(saved.current);
        revertAfterDrag.current = false;
        onTap?.();
        return;
      }
      revertAfterDrag.current = false;
      const thisSave = ++saveCount.current;
      const position = latest.current;
      const { error } = await save(position);
      if (!error && thisSave > savedSeq.current) {
        saved.current = position;
        savedSeq.current = thisSave;
      }
      if (thisSave !== saveCount.current) return;
      if (error && dragActive.current) revertAfterDrag.current = true;
      else if (error) show(saved.current);
      onSaveError(error ? friendlyError(error) : "");
    },
  });

  return { value, dragging, handlers };
}
