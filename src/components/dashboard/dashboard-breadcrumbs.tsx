import { useMatches } from "@tanstack/react-router";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function DashboardBreadcrumbs() {
  const crumbs = useMatches({
    select: (matches) =>
      matches.reduce<{ to: string; label: string }[]>((acc, match) => {
        if (match.staticData.breadcrumb) {
          acc.push({
            to: match.pathname,
            label: match.staticData.breadcrumb as string,
          });
        }
        return acc;
      }, []),
  });

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={crumb.to}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  // biome-ignore lint/suspicious/noExplicitAny: pathname comes from a resolved route match, always a valid registered path — router's literal-union typing can't express that dynamically
                  <BreadcrumbLink to={crumb.to as any}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
