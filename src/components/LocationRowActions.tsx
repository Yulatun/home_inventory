import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { type LocationRow, NO_SHELF_TAKEN } from "@/lib/locations";
import { supabase } from "@/lib/supabase";

/** Inline rename for one row of the Locations list. */
export function RenameForm({
  row,
  onDone,
}: {
  row: LocationRow;
  onDone: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    const { error } = await supabase
      .from("locations")
      .update({ name })
      .eq("id", row.id);

    if (error) {
      setErrorMessage(friendlyError(error, NO_SHELF_TAKEN));
      setStatus("error");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2 py-1">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoFocus
        required
      />
      <Button type="submit" size="sm" disabled={status === "saving"}>
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        Cancel
      </Button>
      {status === "error" && (
        <p className="text-destructive text-xs">{errorMessage}</p>
      )}
    </form>
  );
}

/** Inline delete confirmation for one row of the Locations list. */
export function DeleteConfirm({
  row,
  onDone,
  onCancel,
}: {
  row: LocationRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete() {
    setStatus("deleting");
    const { error } = await supabase.from("locations").delete().eq("id", row.id);
    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus("error");
      return;
    }
    onDone();
  }

  return (
    <div className="flex flex-1 flex-col gap-2 py-2">
      <p className="text-sm">
        Delete "{row.name}"? This also deletes everything nested inside it.
        Items stored here won't be deleted, but will lose their location.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={status === "deleting"}
        >
          {status === "deleting" ? "Deleting..." : "Delete"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {status === "error" && (
        <p className="text-destructive text-xs">{errorMessage}</p>
      )}
    </div>
  );
}
