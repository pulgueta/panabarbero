import { tanstack } from "@panabarbero/constants";
import { signOut, useSession } from "@panabarbero/convex/auth";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Briefcase,
  Calendar,
  LogOut,
  Star,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ThemeToggler } from "./theme-toggler";

export const Header = () => {
  const { data: session } = useSession();
  // const barberStatus = useQuery(api.auth.checkIsBarber, {});

  const isBarber = true; // barberStatus?.isBarber ?? false;

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (!session?.user?.name) return "U";
    const names = session.user.name.split(" ");
    return names
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // const _barbershopOptions =
  //   isBarber && true ? [{ value: "1", label: "Barbería 1" }] : [];
  // isBarber && barberStatus?.isBarber
  // ? barberStatus.barbershops.map((shop) => ({
  //     value: shop._id,
  //     label: shop.name,
  //   }))
  // : [];

  const navigationRoutesWithoutSettings = tanstack
    .getNavigationRoutes(session?.user?.id)
    .filter((route) => route.to !== "/settings");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4">
      <div className="container mx-auto flex h-16 items-center">
        <div className="mr-6 flex">
          <Link
            to="/profile"
            className="font-bold text-2xl tracking-tighter lg:text-3xl"
          >
            PanaBarbero
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center">
          <div className="flex items-center space-x-16 font-medium text-sm">
            {navigationRoutesWithoutSettings.map((route) => (
              <Link
                key={route.to}
                to={route.to}
                style={{
                  viewTransitionName: route.to,
                }}
              >
                {route.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {!session?.user && (
              <Button size="sm" asChild>
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
            )}

            {session?.user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarImage src={session?.user?.image ?? undefined} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-sm leading-none">
                      {session?.user?.name}
                    </p>
                    <p className="text-muted-foreground text-xs leading-none">
                      {session?.user?.email}
                    </p>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex flex-col space-y-1">
                    <Link to="/profile">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </Button>
                    </Link>

                    {!isBarber && (
                      <>
                        <Link to="/appointments">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            size="sm"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Mis Citas
                          </Button>
                        </Link>
                        <Link to="/reviews">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            size="sm"
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Mis Reseñas
                          </Button>
                        </Link>
                      </>
                    )}

                    {isBarber && (
                      <>
                        <Link to="/barbershop-settings">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            size="sm"
                          >
                            <Briefcase className="mr-2 h-4 w-4" />
                            Configuración de Barbería
                          </Button>
                        </Link>
                        <Link to="/analytics">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            size="sm"
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analíticas
                          </Button>
                        </Link>
                      </>
                    )}

                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      size="sm"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <ThemeToggler />
          </div>
        </div>
      </div>
    </header>
  );
};
