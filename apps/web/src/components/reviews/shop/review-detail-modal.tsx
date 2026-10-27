import type { FC } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { StarRating } from "@/components/ui/star-rating";
import type { ShopReviewRow, ShopReviewStatus } from "@/hooks/use-reviews";
import { formatLongDate } from "@/lib/utils";

const statusMeta: Record<
  ShopReviewStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  published: { label: "Publicada", variant: "success" },
  flagged: { label: "Marcada", variant: "destructive" },
  pending: { label: "Pendiente", variant: "warning" },
};

interface ReviewDetailModalProps {
  review: ShopReviewRow | null;
  onClose: () => void;
}

/**
 * Read-only detail for a single review (DESIGN.md §9 rule 3 — glanceable, so a
 * responsive modal). Surfaces the full comment plus the moderation reason when
 * the review is flagged, so the moderation view needs no separate panel.
 */
export const ReviewDetailModal: FC<ReviewDetailModalProps> = ({
  review,
  onClose,
}) => (
  <ResponsiveModal
    open={review !== null}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <ResponsiveModalContent className="sm:max-w-md">
      {review ? (
        <>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              Reseña de {review.authorName}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {review.serviceName} · {formatLongDate(review._creationTime)}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <div className="space-y-4 pt-2 max-sm:pb-4">
            <div className="flex items-center gap-3">
              <StarRating
                readOnly
                value={review.rating}
                starClassName="size-5"
              />
              <span className="font-medium text-sm tabular-nums">
                {review.rating.toFixed(1)}
              </span>
              <Badge variant={statusMeta[review.status].variant}>
                {statusMeta[review.status].label}
              </Badge>
            </div>

            <p className="text-pretty text-sm">
              {review.comment ? (
                review.comment
              ) : (
                <span className="text-muted-foreground">Sin comentario.</span>
              )}
            </p>

            {review.status === "flagged" && review.moderationReason ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <p className="font-medium">Motivo de la moderación</p>
                <p className="mt-1 text-pretty">{review.moderationReason}</p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </ResponsiveModalContent>
  </ResponsiveModal>
);
