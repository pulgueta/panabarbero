import { CalendarPlus, Home, Scissors, Settings2, User } from "lucide-react";

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
      label: "Agendar cita",
      to: "/appointments/create",
      icon: CalendarPlus,
    },
    {
      label: "Ajustes",
      to: "/settings",
      icon: Settings2,
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

export const getNavigationRoutes = (userId?: string) =>
  userId
    ? routes.navigation
    : routes.navigation.filter((route) => route.to !== "/profile");
