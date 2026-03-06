import {
  DeviceMobileIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useTheme } from "./theme-provider";

export const ThemeToggler = () => {
  const { userTheme, setTheme } = useTheme();
  const { isMobile } = useIsMobile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon">
            {userTheme === "system" ? (
              isMobile ? (
                <DeviceMobileIcon className="size-4" />
              ) : (
                <LaptopIcon className="size-4" />
              )
            ) : userTheme === "dark" ? (
              <MoonIcon className="size-4" />
            ) : (
              <SunIcon className="size-4" />
            )}

            <span className="sr-only">Cambiar tema</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
