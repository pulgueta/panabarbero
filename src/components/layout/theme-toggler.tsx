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
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

interface ThemeTogglerProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}

export const ThemeToggler: FC<ThemeTogglerProps> = ({
  size = "icon",
  variant = "outline",
  className,
}) => {
  const { userTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
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
