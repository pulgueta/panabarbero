import { api } from "@panabarbero/convex/api";
import { signIn, signOut, useSession } from "@panabarbero/convex/auth";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Briefcase,
  Calendar,
  LogOut,
  Search,
  Star,
  User,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export const Header = () => {
  const { data: session } = useSession();
  const barberStatus = useQuery(api.auth.checkIsBarber, {});
  const [selectedBarbershop, setSelectedBarbershop] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const isBarber = barberStatus?.isBarber ?? false;

  const handleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
    });
  };

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

  const barbershopOptions =
    isBarber && barberStatus?.isBarber
      ? barberStatus.barbershops.map((shop) => ({
          value: shop._id,
          label: shop.name,
        }))
      : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <div className="mr-6 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">PanaBarbero</span>
          </Link>
        </div>

        {/* Navigation - Conditional based on auth state */}
        <nav className="flex flex-1 items-center space-x-6">
          {/* Barber Navigation */}
          {session?.user && isBarber && (
            <>
              <Combobox
                options={barbershopOptions}
                value={selectedBarbershop}
                onValueChange={setSelectedBarbershop}
                placeholder="Seleccionar barbería"
                searchPlaceholder="Buscar barbería..."
                emptyText="No se encontraron barberías"
              />
              <Link
                to="/services"
                className="font-medium text-sm transition-colors hover:text-primary"
              >
                Mis Servicios
              </Link>
              <Link
                to="/analytics"
                className="font-medium text-sm transition-colors hover:text-primary"
              >
                Analíticas
              </Link>
              <Link
                to="/reviews"
                className="font-medium text-sm transition-colors hover:text-primary"
              >
                Reseñas
              </Link>
            </>
          )}

          {/* Regular User Navigation */}
          {session?.user && !isBarber && (
            <Link
              to="/barbershops"
              className="font-medium text-sm transition-colors hover:text-primary"
            >
              Barberías
            </Link>
          )}

          {/* Unauthenticated Navigation */}
          {!session?.user && (
            <Link
              to="/barbershops"
              className="font-medium text-sm transition-colors hover:text-primary"
            >
              Barberías
            </Link>
          )}
        </nav>

        {/* Search Bar - For all users */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="¿Qué servicio buscas hoy?"
              className="w-[300px] pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {!session?.user && (
              <>
                <Link to="/become-barber">
                  <Button variant="ghost" size="sm">
                    Convertirse en Barbero
                  </Button>
                </Link>
                <Button size="sm" onClick={handleSignIn}>
                  Iniciar Sesión
                </Button>
              </>
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
          </div>
        </div>
      </div>
    </header>
  );
};
