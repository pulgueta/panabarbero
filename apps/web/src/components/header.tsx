import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">Barbershop Manager</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              to="/barbershops"
              className="font-medium text-sm transition-colors hover:text-primary"
            >
              Barberías
            </Link>
            <Link
              to="/appointments"
              className="font-medium text-sm transition-colors hover:text-primary"
            >
              Citas
            </Link>
            <Link
              to="/reviews"
              className="font-medium text-sm transition-colors hover:text-primary"
            >
              Reseñas
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              Iniciar Sesión
            </Button>
            <Button size="sm">Registrarse</Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
