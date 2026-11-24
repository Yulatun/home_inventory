import { useState } from "react";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ItemNameInput } from "@/components/ItemNameInput";
import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  locations: { name: string } | null;
  categories: { name: string } | null;
};

/** Edits an item (name, quantity, move, category) or retires it. */
export function EditItemForm({
  item,
  householdId,
  userId,
  onDone,
}: {
  item: ItemRow;
  householdId: string;
  userId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [newLocationId, setNewLocationId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmingRetire, setConfirmingRetire] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const { error } = await supabase
      .from("items")
      .update({
        name,
        quantity: Number(quantity) || 1,
        updated_by: userId,
        ...(newLocationId ? { location_id: newLocationId } : {}),
        ...(newCategoryId ? { category_id: newCategoryId } : {}),
      })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus("error");
      return;
    }
    onDone();
  }

  async function handleRetire() {
    setStatus("saving");
    const { error } = await supabase
      .from("items")
      .update({
        status: "retired",
        retired_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus("error");
      return;
    }
    onDone();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <form onSubmit={handleSave} className="flex flex-col gap-2">
        <ItemNameInput value={name} onChange={setName} required />
        <Input
          type="number"
          min={1}
          placeholder="Quantity"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <p className="text-muted-foreground text-sm">
          Currently at: {item.locations?.name ?? "Unknown location"}. Pick a
          new location below only if you want to move it.
        </p>
        <LocationPicker householdId={householdId} onChange={setNewLocationId} />
        <p className="text-muted-foreground text-sm">
          Current category: {item.categories?.name ?? "None"}. Pick below
          only if you want to change it.
        </p>
        <CategoryPicker householdId={householdId} onChange={setNewCategoryId} />
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving..." : "Save changes"}
        </Button>
      </form>

      {confirmingRetire ? (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm">
            Retire "{item.name}"? It'll be removed from your active items
            list.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRetire}
              disabled={status === "saving"}
            >
              Retire
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmingRetire(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmingRetire(true)}
        >
          Retire item
        </Button>
      )}

      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}
