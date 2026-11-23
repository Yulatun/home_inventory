import { usePlanCard } from "@/hooks/usePlanCard";
import { type PlanLocation, unitTypeIcon, unitTypeLabel } from "@/lib/locations";
import { cn } from "@/lib/utils";

const CARD_SIZE = { width: 64, height: 64 };

/** A unit on a room's floor plan: drag to arrange, tap to open. */
export function FurnitureCard({
  unit,
  index,
  containerRef,
  onOpen,
  onSaveError,
}: {
  unit: PlanLocation;
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpen: () => void;
  onSaveError: (message: string) => void;
}) {
  const { pos, dragging, handlers } = usePlanCard({
    location: unit,
    index,
    size: CARD_SIZE,
    containerRef,
    onOpen,
    onSaveError,
  });
  const Icon = unitTypeIcon(unit.unit_type);

  return (
    <div
      {...handlers}
      style={{ left: pos.x, top: pos.y, ...CARD_SIZE }}
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
