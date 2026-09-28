import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export function CreateHouseholdForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    const { error } = await supabase.rpc("create_household", {
      household_name: name,
    });
    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Create your household to get started.
      </p>
      <Input
        placeholder="e.g. The Smiths"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Creating..." : "Create household"}
      </Button>
      {status === "error" && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}
