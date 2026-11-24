import { useState } from "react";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ItemNameInput } from "@/components/ItemNameInput";
import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

/** Adds an item: name, quantity, location (shelf or box) and an optional category. */
export function AddItemForm({
  householdId,
  userId,
  onCreated,
}: {
  householdId: string;
  userId: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!locationId) return;
    setStatus("saving");

    const { error } = await supabase.from("items").insert({
      household_id: householdId,
      name,
      quantity: Number(quantity) || 1,
      location_id: locationId,
      category_id: categoryId,
      created_by: userId,
      updated_by: userId,
    });

    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus("error");
      return;
    }

    // Location and category deliberately stay selected — the common case is
    // logging several items from the same shelf (often the same category)
    // in a row, not hopping between locations each time.
    setJustAdded(name);
    setName("");
    setQuantity("1");
    setStatus("idle");
    onCreated();
  }

  const canSubmit = name.trim() !== "" && locationId !== null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t pt-4">
      <p className="text-muted-foreground text-sm">Add an item.</p>
      <ItemNameInput
        value={name}
        onChange={(value) => {
          setName(value);
          setJustAdded(null);
        }}
        required
      />
      <Input
        type="number"
        min={1}
        placeholder="Quantity"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
      />
      <LocationPicker householdId={householdId} onChange={setLocationId} />
      <CategoryPicker householdId={householdId} onChange={setCategoryId} />
      <Button type="submit" disabled={status === "saving" || !canSubmit}>
        {status === "saving" ? "Adding..." : "Add item"}
      </Button>
      {justAdded && (
        <p className="text-sm text-green-600">Added "{justAdded}".</p>
      )}
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}
