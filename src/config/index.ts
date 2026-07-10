import {
  ChatCircleIcon,
  CurrencyDollarIcon,
  HouseIcon,
  ScissorsIcon,
  SparkleIcon,
  SquaresFourIcon,
  UserIcon,
} from "@phosphor-icons/react";

export const APP_NAME = "PanaBarbero" as const;

export const publicRoutes = {
  navigation: [
    {
      label: "Inicio",
      to: "/",
      icon: HouseIcon,
    },
    {
      label: "Barberías",
      to: "/barbershops",
      icon: ScissorsIcon,
    },
    {
      label: "Precios",
      to: "/pricing",
      icon: CurrencyDollarIcon,
    },
    {
      label: "Pana IA",
      to: "/ai",
      icon: SparkleIcon,
    },
    {
      label: "Pana",
      to: "/chat",
      icon: ChatCircleIcon,
    },
  ],
};

/**
 * Site-chrome navigation for barbershop members. The dashboard sections
 * themselves (Citas, Servicios, …) live in the dashboard sidebar
 * (`src/components/dashboard/dashboard-nav.ts`); the site shell links into
 * the panel once.
 */
const memberNavigation = [
  {
    label: "Panel",
    to: "/profile/barbershops/appointments",
    icon: SquaresFourIcon,
  },
  {
    label: "Barberías",
    to: "/barbershops",
    icon: ScissorsIcon,
  },
  {
    label: "Precios",
    to: "/pricing",
    icon: CurrencyDollarIcon,
  },
  {
    label: "Pana",
    to: "/chat",
    icon: ChatCircleIcon,
  },
  {
    label: "Perfil",
    to: "/profile",
    icon: UserIcon,
  },
];

export const authenticatedRoutes = {
  navigation: [
    ...publicRoutes.navigation.filter((route) => route.to !== "/"),
    {
      label: "Perfil",
      to: "/profile",
      icon: UserIcon,
    },
  ],
  member: memberNavigation,
};
