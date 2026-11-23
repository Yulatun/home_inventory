import { useSavedDrag } from "@/hooks/useSavedDrag";
import { type RoomFeature, saveFeaturePosition } from "@/lib/roomFeatures";
import { cn } from "@/lib/utils";

const MARKER_LENGTH = 28;
const MARKER_THICKNESS = 10;

/**
 * A door or window drawn on its wall; drag it along the wall to move it.
 * Save failures are handled as described on useSavedDrag.
 */
export function WallFeatureMarker({
  feature,
  containerRef,
  onSaveError,
}: {
  feature: RoomFeature;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSaveError: (message: string) => void;
}) {
  const horizontal = feature.wall === "top" || feature.wall === "bottom";

  const { value: position, dragging, handlers } = useSavedDrag({
    initial: feature.position,
    measure: () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      return (horizontal ? bounds?.width : bounds?.height) ?? 1;
    },
    apply: (start, { dx, dy }, wallLength) => {
      const along = horizontal ? dx : dy;
      const fraction = wallLength > 0 ? along / wallLength : 0;
      return Math.min(1, Math.max(0, start + fraction));
    },
    save: (newPosition) => saveFeaturePosition(feature.id, newPosition),
    onSaveError,
  });

  return (
    <div
      {...handlers}
      style={markerStyle(feature.wall, position)}
      title={feature.type === "door" ? "Door" : "Window"}
      className={cn(
        "absolute touch-none rounded-sm select-none",
        feature.type === "door" ? "bg-amber-600" : "bg-sky-400",
        dragging && "z-10",
      )}
    />
  );
}

/** Places the marker across its wall, centred at `position` (0–1) along it. */
function markerStyle(wall: RoomFeature["wall"], position: number): React.CSSProperties {
  const along = `calc(${position * 100}% - ${MARKER_LENGTH / 2}px)`;
  const overhang = -MARKER_THICKNESS / 2;

  if (wall === "top" || wall === "bottom") {
    return { width: MARKER_LENGTH, height: MARKER_THICKNESS, left: along, [wall]: overhang };
  }
  return { width: MARKER_THICKNESS, height: MARKER_LENGTH, top: along, [wall]: overhang };
}
