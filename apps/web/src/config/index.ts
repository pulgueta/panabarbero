import {
  Calendar,
  CalendarPlus,
  DollarSign,
  Home,
  Scissors,
  Settings,
  User,
  Users,
} from "lucide-react";

export const APP_NAME = "PanaBarbero" as const;

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
    {
      label: "Precios",
      to: "/pricing",
      icon: DollarSign,
    },
  ],
};

export const authenticatedRoutes = {
  navigation: [
    ...publicRoutes.navigation.filter((route) => route.to !== "/"),
    {
      label: "Perfil",
      to: "/profile",
      icon: User,
    },
  ],
  barber: [
    {
      label: "Citas",
      to: "/profile/barbershops/appointments",
      icon: Calendar,
    },
    {
      label: "Perfil",
      to: "/profile",
      icon: User,
    },
  ],
  owner: [
    {
      label: "Citas",
      to: "/profile/barbershops/appointments",
      icon: Calendar,
    },
    {
      label: "Servicios",
      to: "/profile/barbershops/services",
      icon: Scissors,
    },
    {
      label: "Barberos",
      to: "/profile/barbershops/barbers",
      icon: Users,
    },
    {
      label: "Ajustes",
      to: "/profile/barbershops/settings",
      icon: Settings,
    },
    {
      label: "Perfil",
      to: "/profile",
      icon: User,
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
      label: "Perfil",
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
