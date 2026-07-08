import type { ComponentProps, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsCardProps extends ComponentProps<typeof Card> {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * Uniform container for a single settings group. Every section on the settings
 * page uses this so the surface reads as one consistent, condensed system: a
 * titled card on the tinted page panel, never nested inside another card.
 */
export function SettingsCard({
  title,
  description,
  children,
  className,
  ...props
}: SettingsCardProps) {
  return (
    <Card size="sm" className={cn("h-full", className)} {...props}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}
