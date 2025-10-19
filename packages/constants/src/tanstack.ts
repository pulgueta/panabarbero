export const routes = {
  navigation: [
    {
      label: "Inicio",
      to: "/",
    },
    {
      label: "Barberías",
      to: "/barbershops",
    },
    {
      label: "Agendar cita",
      to: "/appointments/create",
    },
    {
      label: "Perfil",
      to: "/profile",
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
