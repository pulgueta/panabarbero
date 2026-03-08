import {
  CalendarIcon,
  CalendarPlusIcon,
  CurrencyDollarIcon,
  GearSixIcon,
  HouseIcon,
  ScissorsIcon,
  UserIcon,
  UsersIcon,
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
      label: "Agendar",
      to: "/appointments/create",
      icon: CalendarPlusIcon,
    },
    {
      label: "Precios",
      to: "/pricing",
      icon: CurrencyDollarIcon,
    },
  ],
};

export const authenticatedRoutes = {
  navigation: [
    ...publicRoutes.navigation.filter((route) => route.to !== "/"),
    {
      label: "Perfil",
      to: "/profile",
      icon: UserIcon,
    },
  ],
  barber: [
    {
      label: "Citas",
      to: "/profile/barbershops/appointments",
      icon: CalendarIcon,
    },
    {
      label: "Perfil",
      to: "/profile",
      icon: UserIcon,
    },
  ],
  owner: [
    {
      label: "Citas",
      to: "/profile/barbershops/appointments",
      icon: CalendarIcon,
    },
    {
      label: "Servicios",
      to: "/profile/barbershops/services",
      icon: ScissorsIcon,
    },
    {
      label: "Barberos",
      to: "/profile/barbershops/barbers",
      icon: UsersIcon,
    },
    {
      label: "Ajustes",
      to: "/profile/barbershops/settings",
      icon: GearSixIcon,
    },
    {
      label: "Perfil",
      to: "/profile",
      icon: UserIcon,
    },
  ],
};

export const routes = {
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
      label: "Agendar",
      to: "/appointments/create",
      icon: CalendarPlusIcon,
    },
    {
      label: "Perfil",
      to: "/profile",
      icon: UserIcon,
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
