import { useRouteContext, useRouter } from "@tanstack/react-router";
import { Moon, Smartphone, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setThemeServerFn } from "@/lib/theme";

export const ThemeToggler = () => {
  const { theme } = useRouteContext({ from: "__root__" });
  const router = useRouter();

  const toggleTheme = (setTheme: "light" | "dark" | "system") =>
    setThemeServerFn({ data: setTheme }).then(() => router.invalidate());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {theme === "system" ? (
            <Smartphone className="size-4" />
          ) : theme === "dark" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}

          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleTheme("light")}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleTheme("dark")}>
          Oscuro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
