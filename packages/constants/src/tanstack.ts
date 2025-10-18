export const routes = {
  navigation: [
    {
      label: "Inicio",
      to: "/",
      activePattern: "^/$",
    },
    {
      label: "Barberías",
      to: "/barbershops",
      activePattern: "^/barbershops",
    },
    {
      label: "Citas",
      to: "/appointments",
      activePattern: "^/appointments",
    },
    {
      label: "Perfil",
      to: "/profile",
      activePattern: "^/profile",
    },
  ],
  barbershop: {
    index: "/barbershops",
    create: "/barbershops/create",
    edit: "/barbershops/$barbershopUuid/edit",
    show: "/barbershops/$barbershopUuid",
  },
} as const;

export const getNavigationRoutes = (userId?: string) =>
  userId
    ? routes.navigation
    : routes.navigation.filter((route) => route.to !== "/profile");
