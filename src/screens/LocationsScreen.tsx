import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { ApartmentPlan } from "@/components/ApartmentPlan";
import { type LocationRow, LocationList } from "@/components/LocationList";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/context/household";
import { nextLevel } from "@/lib/locations";

export function LocationsScreen() {
  const household = useHousehold();
  const [path, setPath] = useState<LocationRow[]>([]);
  const [view, setView] = useState<"list" | "plan">("list");

  const parent = path.at(-1) ?? null;
  const childLevel = nextLevel(parent?.level ?? null);
  const atRoot = path.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        {path.length > 0 && (
          <button
            type="button"
            onClick={() => setPath((p) => p.slice(0, -1))}
            className="text-muted-foreground -ml-2 flex items-center p-2"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <h1 className="flex-1 font-semibold">{parent ? parent.name : "Locations"}</h1>
        {atRoot && (
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "outline"}
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "plan" ? "default" : "outline"}
              onClick={() => setView("plan")}
            >
              Plan
            </Button>
          </div>
        )}
      </div>

      {atRoot && view === "plan" ? (
        <ApartmentPlan
          householdId={household.id}
          onOpenRoom={(room) => setPath((p) => [...p, room])}
        />
      ) : childLevel ? (
        <LocationList
          key={parent?.id ?? "root"}
          householdId={household.id}
          parentId={parent?.id ?? null}
          level={childLevel}
          onSelect={(location) => setPath((p) => [...p, location])}
        />
      ) : (
        <p className="text-muted-foreground p-4 text-sm">
          Items stored here show up on the Items tab.
        </p>
      )}
    </div>
  );
}
