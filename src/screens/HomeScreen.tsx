import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/context/household";
import { supabase } from "@/lib/supabase";

export function HomeScreen({ session }: { session: Session }) {
  const household = useHousehold();

  return (
    <div className="flex flex-col items-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">{household.name}</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as <span className="font-medium">{session.user.email}</span>
      </p>
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  );
}
