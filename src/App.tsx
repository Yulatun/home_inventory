import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { CenteredLayout } from "@/components/CenteredLayout";
import { HouseholdGate } from "@/components/HouseholdGate";
import { SignIn } from "@/components/SignIn";
import { supabase } from "@/lib/supabase";

function App() {
  const [session, setSession] = useState<Session | null | "loading">(
    "loading",
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession),
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (session === "loading") {
    return (
      <CenteredLayout>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </CenteredLayout>
    );
  }

  if (session === null) {
    return (
      <CenteredLayout>
        <SignIn />
      </CenteredLayout>
    );
  }

  return <HouseholdGate session={session} />;
}

export default App;
