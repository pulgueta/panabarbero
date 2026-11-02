import {
  CheckCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  ProhibitInsetIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/components/layout/theme-provider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { userTheme: theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <ProhibitInsetIcon className="size-4" />,
        loading: <CircleNotchIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
