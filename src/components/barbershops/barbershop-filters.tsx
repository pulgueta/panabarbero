import type { FC } from "react";

import { LocationControl } from "@/components/barbershops/location/location-control";

/**
 * Location filter bar for the barbershops listing. URL↔store sync and all
 * location state now live in `LocationProvider`; this just renders the
 * provider-backed control (inline selects on desktop, Drawer on mobile).
 */
export const BarbershopFilters: FC = () => {
  return <LocationControl />;
};
