import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { friendlyError } from "@/lib/errors";
import {
  type LocationLevel,
  NO_SHELF_TAKEN,
  UNIT_TYPES,
  insertLocation,
  levelLabel,
} from "@/lib/locations";

/** Adds a location with a name the user types (and, for units, a furniture type). */
export function AddLocationForm({
  householdId,
  parentId,
  level,
  onCreated,
}: {
  householdId: string;
  parentId: string | null;
  level: LocationLevel;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const { error } = await insertLocation(householdId, parentId, level, name, unitType);

    if (error) {
      setErrorMessage(friendlyError(error, NO_SHELF_TAKEN));
      setStatus("error");
      return;
    }

    setName("");
    setUnitType("");
    setStatus("idle");
    onCreated();
  }

  const needsUnitType = level === "unit";
  const canSubmit = name.trim() !== "" && (!needsUnitType || unitType !== "");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {(level === "room" || level === "unit" || level === "shelf") && (
        <p className="text-muted-foreground text-sm">
          Or add a custom {levelLabel(level).toLowerCase()}:
        </p>
      )}
      <Input
        placeholder={`${levelLabel(level)} name`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      {needsUnitType && (
        <Select
          value={unitType}
          onValueChange={(value) => setUnitType(value ?? "")}
          items={UNIT_TYPES}
        >
          <SelectTrigger>
            <SelectValue placeholder="What kind of furniture?" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="submit" disabled={status === "saving" || !canSubmit}>
        {status === "saving" ? "Adding..." : `Add ${levelLabel(level).toLowerCase()}`}
      </Button>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}
