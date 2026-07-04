import type { Icon } from "@phosphor-icons/react";
import {
  ChatCircleIcon,
  CurrencyDollarIcon,
  HouseIcon,
  ScissorsIcon,
  SignInIcon,
  SparkleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useCallback } from "react";

import { startOfDay } from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

export interface MobileMenuItem {
  label: string;
  to: string;
  icon: Icon;
}

export interface MobileMenuGroup {
  label: string;
  items: MobileMenuItem[];
}

/**
 * Grouped link list for the mobile menu drawer — everything that does not
 * earn a slot in the top bar. The top bar keeps the persona's primary
 * destination (Reservar / Panel) plus account utilities.
 */
export function getMobileMenuGroups(
  isAuthenticated: boolean,
): MobileMenuGroup[] {
  const explore: MobileMenuItem[] = [
    ...(isAuthenticated ? [] : [{ label: "Inicio", to: "/", icon: HouseIcon }]),
    { label: "Barberías", to: "/barbershops", icon: ScissorsIcon },
    { label: "Precios", to: "/pricing", icon: CurrencyDollarIcon },
  ];

  const pana: MobileMenuItem[] = [
    { label: "Pana IA", to: "/ai", icon: SparkleIcon },
    { label: "Chat con Pana", to: "/chat", icon: ChatCircleIcon },
  ];

  const account: MobileMenuItem[] = isAuthenticated
    ? [{ label: "Mi perfil", to: "/profile", icon: UserIcon }]
    : [{ label: "Iniciar sesión", to: "/login", icon: SignInIcon }];

  return [
    { label: "Explorar", items: explore },
    { label: "Pana", items: pana },
    { label: "Cuenta", items: account },
  ];
}

/**
 * Resolves the `search` params each nav target needs. Extracts the ternary
 * that was previously duplicated across the desktop header and bottom bar so
 * every navigation surface stays in sync.
 */
export function useNavSearch() {
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);

  return useCallback(
    (to: string) => {
      if (to === "/profile") {
        return { tab: "account" } as const;
      }
      if (to === "/profile/barbershops/appointments") {
        return { date: startOfDay(Date.now()).getTime() };
      }
      if (to === "/barbershops") {
        return { city: persistedCity, state: persistedState };
      }
      return undefined;
    },
    [persistedCity, persistedState],
  );
}
