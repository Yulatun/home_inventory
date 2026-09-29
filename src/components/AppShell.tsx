import type { Session } from "@supabase/supabase-js";
import useEmblaCarousel from "embla-carousel-react";
import { Home, MapPin, Package, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BottomTabBar, type Tab } from "@/components/BottomTabBar";
import { ComingSoonScreen } from "@/screens/ComingSoonScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { LocationsScreen } from "@/screens/LocationsScreen";

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
      <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <HomeScreen session={session} />
          </div>
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <LocationsScreen />
          </div>
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <ComingSoonScreen title="Items" />
          </div>
          <div className="h-full min-w-0 flex-[0_0_100%] overflow-y-auto">
            <ComingSoonScreen title="Search" />
          </div>
        </div>
      </div>
      <BottomTabBar tabs={TABS} activeIndex={activeIndex} onSelect={goToTab} />
    </div>
  );
}
