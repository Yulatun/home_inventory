import { useState } from "react";
import { friendlyError } from "@/lib/errors";

export type Preset = { value: string; label: string };

/** A row of one-tap chips that each create a location, with "Adding..." and error states. */
export function PresetChips({
  title,
  presets,
  create,
  duplicateMessage,
  onCreated,
}: {
  title: string;
  presets: readonly Preset[];
  create: (preset: Preset) => PromiseLike<{ error: { message: string; code?: string } | null }>;
  duplicateMessage?: string;
  onCreated: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function add(preset: Preset) {
    setPending(preset.value);
    const { error } = await create(preset);
    setPending(null);
    if (error) {
      setErrorMessage(friendlyError(error, duplicateMessage));
      return;
    }
    onCreated();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">{title}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            disabled={pending === preset.value}
            onClick={() => add(preset)}
            className="rounded-full border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {pending === preset.value ? "Adding..." : preset.label}
          </button>
        ))}
      </div>
      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  );
}
