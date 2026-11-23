import { useCallback, useEffect, useRef, useState } from "react";
import { AddFeatureForm } from "@/components/AddFeatureForm";
import { FurnitureCard } from "@/components/FurnitureCard";
import { WallFeatureMarker } from "@/components/WallFeatureMarker";
import { friendlyError } from "@/lib/errors";
import { type LocationRow, type PlanLocation, fetchPlanUnits } from "@/lib/locations";
import {
  FEATURE_EMOJI,
  type RoomFeature,
  deleteRoomFeature,
  fetchRoomFeatures,
  wallLabel,
} from "@/lib/roomFeatures";

export function RoomPlan({
  householdId,
  roomId,
  onOpenUnit,
}: {
  householdId: string;
  roomId: string;
  onOpenUnit: (unit: LocationRow) => void;
}) {
  const [units, setUnits] = useState<PlanLocation[] | "loading">("loading");
  const [features, setFeatures] = useState<RoomFeature[] | "loading">("loading");
  const [error, setError] = useState("");
  // Failed moves or deletes: shown above the plan, which itself stays usable.
  const [saveError, setSaveError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnits = useCallback(async () => {
    const { data, error } = await fetchPlanUnits(householdId, roomId);
    if (error) {
      setError(friendlyError(error));
      return;
    }
    setUnits(data);
  }, [householdId, roomId]);

  const fetchFeatures = useCallback(async () => {
    const { data, error } = await fetchRoomFeatures(householdId, roomId);
    if (error) {
      setError(friendlyError(error));
      return;
    }
    setFeatures(data);
  }, [householdId, roomId]);

  useEffect(() => {
    fetchUnits();
    fetchFeatures();
  }, [fetchUnits, fetchFeatures]);

  async function handleDeleteFeature(id: string) {
    const { error } = await deleteRoomFeature(id);
    setSaveError(error ? friendlyError(error) : "");
    fetchFeatures();
  }

  if (error) {
    return <p className="text-destructive p-4 text-sm">{error}</p>;
  }

  if (units === "loading" || features === "loading") {
    return <p className="text-muted-foreground p-4 text-sm">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {units.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No furniture yet — add a unit from the List view first, then arrange
          it here.
        </p>
      )}
      {saveError && <p className="text-destructive text-sm">{saveError}</p>}
      <div
        ref={containerRef}
        className="bg-muted/20 relative mx-auto aspect-square w-full max-w-sm border-2"
      >
        {units.map((unit, index) => (
          <FurnitureCard
            key={unit.id}
            unit={unit}
            index={index}
            containerRef={containerRef}
            onOpen={() => onOpenUnit(unit)}
            onSaveError={setSaveError}
          />
        ))}
        {features.map((feature) => (
          <WallFeatureMarker
            key={feature.id}
            feature={feature}
            containerRef={containerRef}
            onSaveError={setSaveError}
          />
        ))}
      </div>

      <AddFeatureForm
        householdId={householdId}
        roomId={roomId}
        onCreated={fetchFeatures}
      />

      {features.length > 0 && (
        <ul className="divide-y rounded-md border">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>
                {FEATURE_EMOJI[feature.type]}{" "}
                {feature.type === "door" ? "Door" : "Window"} (
                {wallLabel(feature.wall)})
              </span>
              <button
                type="button"
                aria-label={`Remove ${feature.type}`}
                onClick={() => handleDeleteFeature(feature.id)}
                className="text-muted-foreground px-2"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
