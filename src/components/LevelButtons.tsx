import { cn } from "@/lib/utils";

export type Option = { id: string; name: string };
export type Options = Option[] | "loading";

/** One level of the location picker (room, unit, shelf or box) as a row of tap-to-pick chips. */
export function LevelButtons({
  label,
  emptyMessage,
  options,
  value,
  onChange,
}: {
  label: string;
  emptyMessage: string;
  options: Options;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  if (options === "loading") {
    return (
      <p className="text-muted-foreground text-sm">Loading {label.toLowerCase()}s...</p>
    );
  }

  if (options.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-sm">{label}:</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              value === option.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background",
            )}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
