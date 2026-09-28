import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CenteredLayout } from "@/components/CenteredLayout";
import { CreateHouseholdForm } from "@/components/CreateHouseholdForm";
import { HouseholdProvider } from "@/context/household";
import { supabase } from "@/lib/supabase";

type Household = { id: string; name: string };

type State =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "none" }
  | { type: "found"; household: Household };

export function HouseholdGate({ session }: { session: Session }) {
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
      <CenteredLayout>
        <p className="text-muted-foreground text-sm">
          Loading your household...
        </p>
      </CenteredLayout>
    );
  }

  if (state.type === "error") {
    return (
      <CenteredLayout>
        <p className="text-destructive text-sm">{state.message}</p>
      </CenteredLayout>
    );
  }

  if (state.type === "none") {
    return (
      <CenteredLayout>
        <CreateHouseholdForm onCreated={handleCreated} />
      </CenteredLayout>
    );
  }

  return (
    <HouseholdProvider household={state.household}>
      <AppShell session={session} />
    </HouseholdProvider>
  );
}
