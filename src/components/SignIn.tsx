import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export function SignIn() {
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
