import {
  Building2,
  CalendarPlus,
  Home,
  Scissors,
  Settings2,
  User,
} from "lucide-react";

export const publicRoutes = {
  navigation: [
    {
      label: "Inicio",
      to: "/",
      icon: Home,
    },
    {
      label: "Barberías",
      to: "/barbershops",
      icon: Scissors,
    },
    {
      label: "Agendar",
      to: "/appointments/create",
      icon: CalendarPlus,
    },
  ],
};

export const authenticatedRoutes = {
  navigation: [
    ...publicRoutes.navigation,
    {
      label: "Portal",
      to: "/profile",
      icon: User,
    },
  ],
  barber: [
    {
      label: "Portal",
      to: "/profile",
      icon: User,
    },
    {
      label: "Gestión",
      to: "/profile/barbershops",
      icon: Building2,
    },
    {
      label: "Ajustes",
      to: "/profile/barbershops/settings",
      icon: Settings2,
    },
  ],
};

export const routes = {
  navigation: [
    {
      label: "Inicio",
      to: "/",
      icon: Home,
    },
    {
      label: "Barberías",
      to: "/barbershops",
      icon: Scissors,
    },
    {
      label: "Agendar",
      to: "/appointments/create",
      icon: CalendarPlus,
    },
    {
      label: "Ajustes",
      to: "/settings",
      icon: Settings2,
    },
    {
      label: "Portal",
      to: "/profile",
      icon: User,
    },
  ],
  barbershop: {
    index: "/barbershops",
    create: "/barbershops/create",
    edit: "/barbershops/$barbershopUuid/edit",
    show: "/barbershops/$barbershopUuid",
  },
};

export const localStorageKeys = {
  barbershopsLatest: "barbershops_latest",
  barbershopsState: "barbershops_state",
  barbershopsCity: "barbershops_city",
};

export const getNavigationRoutes = (userId: string | undefined) =>
  userId
    ? routes.navigation
    : routes.navigation.filter((route) => route.to !== "/profile");
