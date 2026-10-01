import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_PRESETS } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

export function CategoryPicker({
  householdId,
  onChange,
}: {
  householdId: string;
  onChange: (categoryId: string | null) => void;
}) {
  const [categories, setCategories] = useState<Category[] | "loading">("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .eq("household_id", householdId)
      .order("name");

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setCategories(data);
  }, [householdId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function select(id: string | null) {
    setSelectedId(id);
    onChange(id);
  }

  async function selectOrCreate(name: string) {
    if (categories === "loading") return;
    const existing = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      select(existing.id);
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ household_id: householdId, name })
      .select("id, name")
      .single();
    setCreating(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setCategories((prev) => (prev === "loading" ? prev : [...prev, data]));
    select(data.id);
  }

  async function handleAddCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    await selectOrCreate(trimmed);
    setCustomName("");
  }

  const existing = categories === "loading" ? [] : categories;
  const suggestions = CATEGORY_PRESETS.filter(
    (preset) => !existing.some((c) => c.name.toLowerCase() === preset.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-sm">Category (optional):</p>
      {categories === "loading" ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {existing.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => select(selectedId === category.id ? null : category.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                selectedId === category.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background",
              )}
            >
              {category.name}
            </button>
          ))}
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              disabled={creating}
              onClick={() => selectOrCreate(name)}
              className="text-muted-foreground rounded-full border border-dashed px-3 py-1.5 text-sm disabled:opacity-50"
            >
              + {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Or type your own"
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddCustom}
          disabled={creating || customName.trim() === ""}
        >
          Add
        </Button>
      </div>
      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}
