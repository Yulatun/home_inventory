import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/LocationPicker";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  locations: { name: string } | null;
};

export function ItemsScreen({ session }: { session: Session }) {
  const household = useHousehold();
  const [items, setItems] = useState<ItemRow[] | "loading">("loading");
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, name, quantity, locations(name)")
      .eq("household_id", household.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .returns<ItemRow[]>();

    if (error) {
      setError(error.message);
      return;
    }
    setItems(data);
  }, [household.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-semibold">Items</h1>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {items === "loading" ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No items yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{item.name}</span>
              <span className="text-muted-foreground text-xs">
                {item.quantity > 1 ? `x${item.quantity} - ` : ""}
                {item.locations?.name ?? "Unknown location"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <AddItemForm
        householdId={household.id}
        userId={session.user.id}
        onCreated={fetchItems}
      />
    </div>
  );
}

function AddItemForm({
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
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!locationId) return;
    setStatus("saving");

    const { error } = await supabase.from("items").insert({
      household_id: householdId,
      name,
      quantity: Number(quantity) || 1,
      location_id: locationId,
      created_by: userId,
      updated_by: userId,
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setName("");
    setQuantity("1");
    setLocationId(null);
    setStatus("idle");
    onCreated();
  }

  const canSubmit = name.trim() !== "" && locationId !== null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t pt-4">
      <p className="text-muted-foreground text-sm">Add an item.</p>
      <Input
        placeholder="Item name"
        value={name}
        onChange={(event) => setName(event.target.value)}
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
      <Button type="submit" disabled={status === "saving" || !canSubmit}>
        {status === "saving" ? "Adding..." : "Add item"}
      </Button>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}
