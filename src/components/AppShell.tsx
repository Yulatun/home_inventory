import type { Session } from "@supabase/supabase-js";
import useEmblaCarousel from "embla-carousel-react";
import { Home, MapPin, Package, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BottomTabBar, type Tab } from "@/components/BottomTabBar";
import { HomeScreen } from "@/screens/HomeScreen";
import { ItemsScreen } from "@/screens/ItemsScreen";
import { LocationsScreen } from "@/screens/LocationsScreen";
import { SearchScreen } from "@/screens/SearchScreen";

const TABS: readonly Tab[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "items", label: "Items", icon: Package },
  { id: "search", label: "Search", icon: Search },
];

export function AppShell({ session }: { session: Session }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start" });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    // Catch a viewport scroll that happened before onScroll was attached.
    emblaApi.rootNode().scrollLeft = 0;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const goToTab = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  return (
    <div className="flex h-svh flex-col">
      {/* Embla moves slides with transforms; any native scroll of the viewport
          (focus landing in an off-screen slide, Tab key, browser restore)
          would desync the slides from the tab bar, so undo it immediately. */}
      <div
        className="min-h-0 flex-1 overflow-hidden"
        ref={emblaRef}
        onScroll={(event) => {
          event.currentTarget.scrollLeft = 0;
        }}
      >
        <div className="flex h-full">
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <HomeScreen session={session} />
          </div>
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <LocationsScreen />
          </div>
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <ItemsScreen session={session} />
          </div>
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <SearchScreen active={TABS[activeIndex].id === "search"} />
          </div>
        </div>
      </div>
      <BottomTabBar tabs={TABS} activeIndex={activeIndex} onSelect={goToTab} />
    </div>
  );
}
