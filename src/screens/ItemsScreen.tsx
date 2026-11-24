import type { Session } from "@supabase/supabase-js";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddItemForm } from "@/components/AddItemForm";
import { EditItemForm, type ItemRow } from "@/components/EditItemForm";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";

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
      setError(friendlyError(error));
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
