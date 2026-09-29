import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  locations: { name: string } | null;
};

export function SearchScreen() {
  const household = useHousehold();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage(error.message);
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
        placeholder="Search items by name..."
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        autoFocus
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
