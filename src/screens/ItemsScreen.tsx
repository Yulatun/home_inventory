import type { Session } from "@supabase/supabase-js";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CategoryPicker } from "@/components/CategoryPicker";
import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  locations: { name: string } | null;
  categories: { name: string } | null;
};

export function ItemsScreen({ session }: { session: Session }) {
  const household = useHousehold();
  const [items, setItems] = useState<ItemRow[] | "loading">("loading");
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, name, quantity, locations(name), categories(name)")
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

  if (editingItem) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b p-4">
          <button
            type="button"
            onClick={() => setEditingItem(null)}
            className="text-muted-foreground -ml-2 flex items-center p-2"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-semibold">{editingItem.name}</h1>
        </div>
        <EditItemForm
          item={editingItem}
          householdId={household.id}
          userId={session.user.id}
          onDone={() => {
            setEditingItem(null);
            fetchItems();
          }}
        />
      </div>
    );
  }

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
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setEditingItem(item)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
              >
                <span>{item.name}</span>
                <span className="text-muted-foreground text-xs">
                  {item.categories?.name ? `${item.categories.name} - ` : ""}
                  {item.quantity > 1 ? `x${item.quantity} - ` : ""}
                  {item.locations?.name ?? "Unknown location"}
                </span>
              </button>
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
      setErrorMessage(error.message);
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
      <Input
        placeholder="Item name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
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

function EditItemForm({
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
      setErrorMessage(error.message);
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
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }
    onDone();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <form onSubmit={handleSave} className="flex flex-col gap-2">
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
