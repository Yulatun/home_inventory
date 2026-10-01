import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ITEM_NAME_SUGGESTIONS } from "@/lib/itemNames";

export function ItemNameInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  const query = value.trim();
  const suggestions =
    dismissed || query === ""
      ? []
      : ITEM_NAME_SUGGESTIONS.filter(
          (name) =>
            name.toLowerCase().startsWith(query.toLowerCase()) &&
            name.toLowerCase() !== query.toLowerCase(),
        ).slice(0, 6);

  return (
    <div className="relative">
      <Input
        placeholder="Item name"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setDismissed(false);
        }}
        onBlur={() => setDismissed(true)}
        required={required}
      />
      {suggestions.length > 0 && (
        <ul className="bg-popover absolute z-10 mt-1 w-full rounded-md border shadow-md">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(name);
                  setDismissed(true);
                }}
                className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
