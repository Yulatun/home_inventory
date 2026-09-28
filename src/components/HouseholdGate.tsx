import { useCallback, useEffect, useState } from "react";
import { CreateHouseholdForm } from "@/components/CreateHouseholdForm";
import { supabase } from "@/lib/supabase";

type Household = { id: string; name: string };

type State =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "none" }
  | { type: "found"; household: Household };

export function HouseholdGate() {
  const [state, setState] = useState<State>({ type: "loading" });

  const fetchHousehold = useCallback(async () => {
    const { data, error } = await supabase
      .from("households")
      .select("id, name")
      .maybeSingle();

    if (error) {
      setState({ type: "error", message: error.message });
      return;
    }
    setState(data ? { type: "found", household: data } : { type: "none" });
  }, []);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  function handleCreated() {
    setState({ type: "loading" });
    fetchHousehold();
  }

  if (state.type === "loading") {
    return (
      <p className="text-muted-foreground text-sm">Loading your household...</p>
    );
  }

  if (state.type === "error") {
    return <p className="text-destructive text-sm">{state.message}</p>;
  }

  if (state.type === "none") {
    return <CreateHouseholdForm onCreated={handleCreated} />;
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-lg font-medium">{state.household.name}</p>
      <p className="text-muted-foreground text-sm">No rooms yet.</p>
    </div>
  );
}
