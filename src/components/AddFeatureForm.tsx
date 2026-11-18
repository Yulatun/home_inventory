import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { friendlyError } from "@/lib/errors";
import {
  FEATURE_TYPES,
  type FeatureType,
  WALLS,
  type Wall,
  insertRoomFeature,
} from "@/lib/roomFeatures";

/** Adds a door or window to one wall of a room's floor plan. */
export function AddFeatureForm({
  householdId,
  roomId,
  onCreated,
}: {
  householdId: string;
  roomId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState<FeatureType>("door");
  const [wall, setWall] = useState<Wall>("top");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAdd() {
    setStatus("saving");
    const { error } = await insertRoomFeature(householdId, roomId, type, wall);
    setStatus("idle");
    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus("error");
      return;
    }
    onCreated();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">Add a door or window:</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={type}
          onValueChange={(v) => setType((v as FeatureType) || "door")}
          items={FEATURE_TYPES}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="door">Door</SelectItem>
            <SelectItem value="window">Window</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={wall}
          onValueChange={(v) => setWall((v as Wall) || "top")}
          items={WALLS}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WALLS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleAdd} disabled={status === "saving"}>
          {status === "saving" ? "Adding..." : "Add"}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}
