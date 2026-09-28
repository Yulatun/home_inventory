import { createContext, useContext } from "react";

type Household = { id: string; name: string };

const HouseholdContext = createContext<Household | null>(null);

export function HouseholdProvider({
  household,
  children,
}: {
  household: Household;
  children: React.ReactNode;
}) {
  return (
    <HouseholdContext.Provider value={household}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const household = useContext(HouseholdContext);
  if (!household) {
    throw new Error("useHousehold must be used within a HouseholdProvider");
  }
  return household;
}
