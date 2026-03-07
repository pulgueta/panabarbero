import type { FC } from "react";

interface DashboardHeaderProps {
  title: string;
  description: string;
}

export const DashboardHeader: FC<DashboardHeaderProps> = ({
  title,
  description,
}) => {
  return (
    <header className="space-y-1">
      <h1
        className="text-balance font-bold text-xl tracking-tight"
        style={{
          viewTransitionName: `dashboard-${title}`,
        }}
      >
        {title}
      </h1>
      <p
        className="text-pretty text-muted-foreground text-sm"
        style={{
          viewTransitionName: `dashboard-${title}-description`,
        }}
      >
        {description}
      </p>
    </header>
  );
};
