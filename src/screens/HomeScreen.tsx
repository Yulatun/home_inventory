import type { Session } from "@supabase/supabase-js";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { ApartmentPlan } from "@/components/ApartmentPlan";
import { RoomPlan } from "@/components/RoomPlan";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";

export function HomeScreen({ session }: { session: Session }) {
  const household = useHousehold();
  const [openRoom, setOpenRoom] = useState<{ id: string; name: string } | null>(null);

  if (openRoom) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b p-4">
          <button
            type="button"
            onClick={() => setOpenRoom(null)}
            className="text-muted-foreground -ml-2 flex items-center p-2"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-semibold">{openRoom.name}</h1>
        </div>
        <RoomPlan householdId={household.id} roomId={openRoom.id} onOpenUnit={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{household.name}</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as <span className="font-medium">{session.user.email}</span>
        </p>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
      <ApartmentPlan householdId={household.id} onOpenRoom={setOpenRoom} />
    </div>
  );
}
