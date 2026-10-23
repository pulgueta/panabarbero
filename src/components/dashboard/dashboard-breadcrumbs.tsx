import { useMatches } from "@tanstack/react-router";
import { Fragment } from "react";
import type { ComponentProps } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type CrumbTo = ComponentProps<typeof BreadcrumbLink>["to"];

export function DashboardBreadcrumbs() {
  const crumbs = useMatches({
    select: (matches) =>
      matches.reduce<{ to: string; label: string }[]>((acc, match) => {
        if (match.staticData.breadcrumb) {
          acc.push({
            to: match.pathname,
            label: match.staticData.breadcrumb,
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
                  <BreadcrumbLink
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: `to` is the pathname of a resolved route match, so it is always a registered path.
                    to={crumb.to as CrumbTo}
                  >
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
