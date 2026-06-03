import {
  CalendarIcon,
  CalendarPlusIcon,
  ChatCircleIcon,
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
    {
      label: "Pana IA",
      to: "/chat",
      icon: ChatCircleIcon,
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
  staff: [
    {
      label: "Citas",
      to: "/profile/barbershops/appointments",
      icon: CalendarIcon,
    },
    {
      label: "Equipo",
      to: "/profile/barbershops/team",
      icon: UsersIcon,
    },
    {
      label: "Servicios",
      to: "/profile/barbershops/services",
      icon: ScissorsIcon,
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
      label: "Equipo",
      to: "/profile/barbershops/team",
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
