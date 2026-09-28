import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HouseholdGate } from "@/components/HouseholdGate";
import { SignIn } from "@/components/SignIn";
import { supabase } from "@/lib/supabase";

function Dashboard({ session }: { session: Session }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <p>
        Signed in as{" "}
        <span className="font-medium">{session.user.email}</span>
      </p>
      <HouseholdGate />
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  );
}

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

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Home Inventory</h1>
      {session === "loading" ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : session === null ? (
        <SignIn />
      ) : (
        <Dashboard session={session} />
      )}
    </div>
  );
}

export default App;
