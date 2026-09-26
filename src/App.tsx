import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-muted-foreground text-sm">
        Check <span className="font-medium">{email}</span> for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send magic link"}
      </Button>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}

function HouseholdsCheck() {
  const [state, setState] = useState<
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "loaded"; households: { id: string; name: string }[] }
  >({ type: "loading" });

  useEffect(() => {
    supabase
      .from("households")
      .select("id, name")
      .then(({ data, error }) => {
        if (error) {
          setState({ type: "error", message: error.message });
          return;
        }
        setState({ type: "loaded", households: data ?? [] });
      });
  }, []);

  if (state.type === "loading") {
    return <p className="text-muted-foreground text-sm">Querying households...</p>;
  }

  if (state.type === "error") {
    return <p className="text-destructive text-sm">Query failed: {state.message}</p>;
  }

  return (
    <p className="text-muted-foreground text-sm">
      {state.households.length === 0
        ? "Connected to Supabase. You're not in a household yet."
        : `Connected to Supabase. Households: ${state.households.map((h) => h.name).join(", ")}`}
    </p>
  );
}

function Dashboard({ session }: { session: Session }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
      <p>
        Signed in as{" "}
        <span className="font-medium">{session.user.email}</span>
      </p>
      <HouseholdsCheck />
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
