import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export function BottomTabBar({
  tabs,
  activeIndex,
  onSelect,
}: {
  tabs: readonly Tab[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const active = index === activeIndex;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(index)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
