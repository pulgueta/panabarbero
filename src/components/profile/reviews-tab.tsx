import {
  ClockIcon,
  StarIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { formatRelativeTime } from "@/components/notifications/relative-time";
import { ReviewDialog } from "@/components/reviews/review-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import {
  type ReviewableAppointment,
  useMyReviews,
  useReviewActions,
  useReviewableAppointments,
} from "@/hooks/use-reviews";
import { getLogoUrl } from "@/hooks/use-upload";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { formatLongDate } from "@/lib/utils";

const ConfirmationDialog = lazy(() =>
  import("@/components/confirmation-dialog").then((module) => ({
    default: module.ConfirmationDialog,
  })),
);

const COMMENT_MAX_LENGTH = 500;

type MyReview = ReturnType<typeof useMyReviews>["data"][number];

interface DeleteReviewButtonProps {
  reviewId: MyReview["_id"];
}

const DeleteReviewButton: FC<DeleteReviewButtonProps> = ({ reviewId }) => {
  const haptic = useWebHaptics();
  const {
    deleteReviewMutation: { mutateAsync: deleteReview, isPending },
  } = useReviewActions();

  const handleDelete = async () => {
    try {
      await deleteReview({ reviewId });
      haptic.trigger("success");
      toast.success("Tu reseña fue eliminada.");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  return (
    <Suspense fallback={null}>
      <ConfirmationDialog
        title="Eliminar reseña"
        description="Esta acción eliminará tu reseña de forma permanente. No se puede deshacer."
        trigger={
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            className="shrink-0"
          >
            <TrashIcon />
            Eliminar
          </Button>
        }
        confirmLabel={
          <Button
            variant="destructive"
            className="w-full"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending && <Spinner />} Sí, eliminar
          </Button>
        }
      />
    </Suspense>
  );
};

interface ReviewMetaProps {
  review: MyReview;
}

const ReviewMeta: FC<ReviewMetaProps> = ({ review }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
    <span className="font-medium text-foreground">{review.barbershopName}</span>
    <span aria-hidden>•</span>
    <span>{review.serviceName}</span>
    <span aria-hidden>•</span>
    <span suppressHydrationWarning>
      {formatRelativeTime(review._creationTime)}
    </span>
  </div>
);

const FlaggedReviewCard: FC<ReviewMetaProps> = ({ review }) => {
  const haptic = useWebHaptics();
  const [comment, setComment] = useState(review.comment ?? "");
  const {
    updateReviewMutation: { mutateAsync: updateReview, isPending },
  } = useReviewActions();

  const handleSave = async () => {
    try {
      const result = await updateReview({
        reviewId: review._id,
        comment: comment.trim() ? comment.trim() : undefined,
      });
      haptic.trigger("success");
      toast.success(
        result.status === "published"
          ? "Tu reseña ya está publicada."
          : "Tu reseña fue actualizada y será revisada de nuevo.",
      );
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  const commentId = `flagged-review-${review._id}`;

  return (
    <Alert variant="warning" className="gap-3">
      <WarningCircleIcon weight="fill" />
      <AlertTitle>Reseña ocultada</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <p>
          Tu reseña fue ocultada por incumplir nuestras normas. Edítala con un
          tono respetuoso para volver a publicarla, o elimínala.
        </p>

        {review.moderationReason && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-warning text-xs">
            Motivo: {review.moderationReason}
          </p>
        )}

        <div className="flex items-center gap-2 text-foreground">
          <StarRating value={review.rating} readOnly starClassName="size-4" />
          <ReviewMeta review={review} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={commentId}
            className="font-medium text-foreground text-sm"
          >
            Tu comentario
          </label>
          <Textarea
            id={commentId}
            value={comment}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Cuéntanos tu experiencia con respeto."
            onChange={(e) => setComment(e.target.value)}
          />
          <span className="self-end text-muted-foreground text-xs tabular-nums">
            {comment.length}/{COMMENT_MAX_LENGTH}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <DeleteReviewButton reviewId={review._id} />
          <Button size="sm" disabled={isPending} onClick={handleSave}>
            {isPending && <Spinner />} Guardar cambios
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

interface ReviewableAppointmentCardProps {
  appointment: ReviewableAppointment;
}

const ReviewableAppointmentCard: FC<ReviewableAppointmentCardProps> = ({
  appointment,
}) => (
  <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
      <img
        src={getLogoUrl(appointment.logoKey) ?? "/default-logo.png"}
        alt={`Logo de ${appointment.barbershopName}`}
        className="size-full object-cover"
        loading="lazy"
      />
    </div>

    <div className="min-w-0 flex-1 space-y-0.5">
      <p className="truncate font-medium text-foreground text-sm">
        {appointment.barbershopName}
      </p>
      <p className="truncate text-muted-foreground text-xs">
        {appointment.serviceName}
        <span aria-hidden> • </span>
        <span suppressHydrationWarning>{formatLongDate(appointment.date)}</span>
      </p>
    </div>

    <ReviewDialog
      appointmentId={appointment.appointmentId}
      serviceName={appointment.serviceName}
      trigger={
        <Button size="sm" className="shrink-0">
          Dejar reseña
        </Button>
      }
    />
  </div>
);

const PendingReviewCard: FC<ReviewMetaProps> = ({ review }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
    <div className="flex items-center justify-between gap-2">
      <StarRating value={review.rating} readOnly starClassName="size-4" />
      <Badge variant="secondary" className="gap-1">
        <ClockIcon />
        En revisión
      </Badge>
    </div>

    {review.comment && (
      <p className="text-pretty text-foreground text-sm">{review.comment}</p>
    )}

    <div className="flex items-center justify-between gap-2">
      <ReviewMeta review={review} />
      <DeleteReviewButton reviewId={review._id} />
    </div>
  </div>
);

const PublishedReviewCard: FC<ReviewMetaProps> = ({ review }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
    <div className="flex items-center justify-between gap-2">
      <StarRating value={review.rating} readOnly starClassName="size-4" />
      <DeleteReviewButton reviewId={review._id} />
    </div>

    {review.comment && (
      <p className="text-pretty text-foreground text-sm">{review.comment}</p>
    )}

    <ReviewMeta review={review} />
  </div>
);

export const ReviewsTab = () => {
  const { data: reviews } = useMyReviews();
  const { data: reviewable } = useReviewableAppointments();

  if (reviews.length === 0 && reviewable.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed py-16">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <StarIcon weight="duotone" />
        </div>
        <EmptyTitle>Aún no tienes reseñas</EmptyTitle>
        <EmptyDescription>
          Cuando completes una cita en una barbería podrás dejar tu reseña aquí.
        </EmptyDescription>
      </Empty>
    );
  }

  const flagged = reviews.filter((review) => review.status === "flagged");
  const pending = reviews.filter((review) => review.status === "pending");
  const published = reviews.filter((review) => review.status === "published");

  return (
    <section className="flex flex-col gap-6">
      {reviewable.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Por reseñar
          </h3>
          <div className="flex flex-col gap-3">
            {reviewable.map((appointment) => (
              <ReviewableAppointmentCard
                key={appointment.appointmentId}
                appointment={appointment}
              />
            ))}
          </div>
        </div>
      )}

      {flagged.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Necesitan tu atención
          </h3>
          <div className="flex flex-col gap-3">
            {flagged.map((review) => (
              <FlaggedReviewCard key={review._id} review={review} />
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
            En revisión
          </h3>
          <div className="flex flex-col gap-3">
            {pending.map((review) => (
              <PendingReviewCard key={review._id} review={review} />
            ))}
          </div>
        </div>
      )}

      {published.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Publicadas
          </h3>
          <div className="flex flex-col gap-3">
            {published.map((review) => (
              <PublishedReviewCard key={review._id} review={review} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
