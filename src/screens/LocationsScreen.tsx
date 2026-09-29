import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { type LocationRow, LocationList } from "@/components/LocationList";
import { useHousehold } from "@/context/household";
import { nextLevel } from "@/lib/locations";

export function LocationsScreen() {
  const household = useHousehold();
  const [path, setPath] = useState<LocationRow[]>([]);

  const parent = path.at(-1) ?? null;
  const childLevel = nextLevel(parent?.level ?? null);

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
        <h1 className="font-semibold">{parent ? parent.name : "Locations"}</h1>
      </div>

      {childLevel ? (
        <LocationList
          key={parent?.id ?? "root"}
          householdId={household.id}
          parentId={parent?.id ?? null}
          level={childLevel}
          onSelect={(location) => setPath((p) => [...p, location])}
        />
      ) : (
        <p className="text-muted-foreground p-4 text-sm">
          Items stored here will show up once the Items tab is built.
        </p>
      )}
    </div>
  );
}
