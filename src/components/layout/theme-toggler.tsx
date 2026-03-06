import {
  DeviceMobileIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";

interface ThemeTogglerProps {
  size?: "sm" | "icon" | "lg";
}

export const ThemeToggler: FC<ThemeTogglerProps> = ({ size = "icon" }) => {
  const { userTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={size as ButtonProps["size"]}
            className="gap-2"
          >
            {userTheme === "system" ? (
              <>
                <DeviceMobileIcon className="block md:hidden" />
                <LaptopIcon className="hidden md:block" />

                {size !== "icon" && "Sistema"}
              </>
            ) : userTheme === "dark" ? (
              <>
                <MoonIcon className="size-4" />
                {size !== "icon" && "Oscuro"}
              </>
            ) : (
              <>
                <SunIcon className="size-4" />
                {size !== "icon" && "Claro"}
              </>
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
