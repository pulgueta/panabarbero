import {
  DeviceMobileIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";
import type { ComponentProps, FC } from "react";

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

interface ThemeTogglerProps
  extends Omit<
    ComponentProps<typeof DropdownMenuTrigger>,
    "render" | "children"
  > {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

/**
 * Doubles as a menu row: when composed via another primitive's `render` prop
 * (e.g. `<DropdownMenuItem render={<ThemeToggler .../>}>`), the host's
 * ref/click/keyboard/ARIA props land here as `...triggerProps` and get
 * forwarded onto our own trigger so this stays a real, focusable, registered
 * item instead of an inert nested dropdown.
 */
export const ThemeToggler: FC<ThemeTogglerProps> = ({
  size = "icon",
  variant = "outline",
  className,
  ...triggerProps
}) => {
  const { userTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...triggerProps}
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
