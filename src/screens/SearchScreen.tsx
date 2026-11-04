import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  locations: { name: string } | null;
};

export function SearchScreen({ active }: { active: boolean }) {
  const household = useHousehold();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Focus only once this tab is showing: autoFocus on an off-screen carousel
  // slide makes the browser scroll the carousel viewport to it, desyncing
  // the slides from the tab bar. preventScroll leaves positioning to Embla.
  useEffect(() => {
    if (active) inputRef.current?.focus({ preventScroll: true });
  }, [active]);

  async function handleChange(value: string) {
    setQuery(value);

    if (value.trim() === "") {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const { data, error } = await supabase
      .from("items")
      .select("id, name, quantity, locations(name)")
      .eq("household_id", household.id)
      .eq("status", "active")
      .ilike("name", `%${value.trim()}%`)
      .order("name")
      .returns<ItemRow[]>();

    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus("error");
      return;
    }
    setResults(data);
    setStatus("idle");
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-semibold">Search</h1>
      <Input
        ref={inputRef}
        placeholder="Search items by name..."
        value={query}
        onChange={(event) => handleChange(event.target.value)}
      />

      {status === "loading" && (
        <p className="text-muted-foreground text-sm">Searching...</p>
      )}
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
      {status === "idle" && query.trim() !== "" && results.length === 0 && (
        <p className="text-muted-foreground text-sm">No matches.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y rounded-md border">
          {results.map((item) => (
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
    </div>
  );
}
