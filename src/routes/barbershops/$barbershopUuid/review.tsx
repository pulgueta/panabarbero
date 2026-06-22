import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import { reviewInviteQueryOptions } from "@/hooks/use-reviews";
import { getLogoUrl } from "@/hooks/use-upload";
import { formatLongDate } from "@/lib/utils";

const ReviewForm = lazy(() =>
  import("@/components/reviews/review-form").then((module) => ({
    default: module.ReviewForm,
  })),
);

// A missing/garbage `code` falls back to "" so the loader's invite check
// redirects to the barbershop view (same as an invalid code) instead of
// throwing into the error boundary.
const searchSchema = z.object({
  code: z.string().catch(""),
});

export const Route = createFileRoute("/barbershops/$barbershopUuid/review")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  validateSearch: searchSchema,
  ssr: "data-only",
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  beforeLoad: ({ context }) => {
    // Authenticated customers only.
    if (!context.userId) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ context, params, deps }) => {
    // Cheap guard first: validate the single-use code. An invalid/used/foreign
    // code costs exactly this one query, then bounces — nothing else is fetched.
    const invite = await context.queryClient.ensureQueryData(
      reviewInviteQueryOptions(deps.code, params.barbershopUuid),
    );

    if (!invite) {
      throw redirect({
        to: "/barbershops/$barbershopUuid",
        params: { barbershopUuid: params.barbershopUuid },
      });
    }
  },
});

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();
  const { code } = Route.useSearch();

  const { data: invite } = useSuspenseQuery(
    reviewInviteQueryOptions(code, barbershopUuid),
  );

  if (!invite) return null;

  return (
    <BorderContainer>
      <main className="mx-auto w-full max-w-2xl space-y-6 pb-8">
        <section className="space-y-1">
          <h1 className="text-balance font-semibold text-3xl tracking-tight">
            Deja tu reseña
          </h1>
          <CardDescription>
            Cuéntale a otros clientes cómo te fue. Tu reseña es opcional.
          </CardDescription>
        </section>

        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            <img
              src={getLogoUrl(invite.logoKey) ?? "/default-logo.png"}
              alt={`Logo de ${invite.barbershopName}`}
              className="size-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-semibold text-foreground">
              {invite.barbershopName}
            </p>
            <p className="truncate text-muted-foreground text-sm">
              {invite.serviceName}
            </p>
            <p
              className="text-muted-foreground text-sm"
              suppressHydrationWarning
            >
              {formatLongDate(invite.date)}
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-10 w-48 rounded-lg" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
            </div>
          }
        >
          <ReviewForm
            code={code}
            barbershopUuid={barbershopUuid}
            serviceName={invite.serviceName}
          />
        </Suspense>
      </main>
    </BorderContainer>
  );
}
