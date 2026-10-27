import type { FC } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SettingsPageSkeletonProps {
  /** One Tailwind height class per form card, top to bottom. */
  blocks: string[];
  /** Optional max-width wrapper so the skeleton matches the page's column. */
  className?: string;
}

/**
 * Route-level pending state for a settings sub-page. Mirrors the page anatomy
 * (heading row → one card per form) so the real page swaps in without any
 * layout shift.
 */
export const SettingsPageSkeleton: FC<SettingsPageSkeletonProps> = ({
  blocks,
  className,
}) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
    <div className={cn("space-y-4", className)}>
      {blocks.map((height, index) => (
        <Skeleton
          key={`${height}-${index}`}
          className={cn("w-full rounded-xl", height)}
        />
      ))}
    </div>
  </div>
);
