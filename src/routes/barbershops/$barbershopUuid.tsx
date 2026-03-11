/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: objects are guaranteed to be not null */

import type { BarbershopMetadata, Review } from "@convex/schema";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ServicesSkeleton } from "@/components/layout/skeleton/services-skeleton";
import { useCarouselApi } from "@/components/ui/carousel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByUuidQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/barbershop/use-barbershop";
import {
  barberByUserIdQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import {
  barbershopSeo,
  barbershopStructuredData,
  breadcrumbStructuredData,
  getCanonicalUrl,
} from "@/lib/utils";

const BarbershopHeader = lazy(() =>
  import("@/components/barbershops/barbershop-header").then((module) => ({
    default: module.BarbershopHeader,
  })),
);

const ServicesGrid = lazy(() =>
  import("@/components/barbershops/services/services-grid").then((module) => ({
    default: module.ServicesGrid,
  })),
);

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    const barbershop = await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        profileQueryOptions(user.userId),
      );

      await context.queryClient.ensureQueryData(
        barberByUserIdQueryOptions(user.userId),
      );
    }

    const metadata: BarbershopMetadata | null = null;
    const reviews: Review[] = [];

    if (barbershop?._id) {
      await context.queryClient.ensureQueryData(
        servicesQueryOptions(barbershop._id),
      );

      const barbershopMembers = await context.queryClient.ensureQueryData(
        barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
      );

      if (barbershopMembers.length > 0) {
        await Promise.all(
          barbershopMembers.map((barbershopMember) =>
            context.queryClient.ensureQueryData(
              servicesForBarberQueryOptions(barbershopMember._id),
            ),
          ),
        );
      }
    }

    return {
      seoBarbershop: barbershop,
      seoMetadata: metadata,
      seoReviews: reviews,
    };
  },
  head: ({ match }) => {
    const barbershop = match.context.seoBarbershop;
    const metadata = match.context.seoMetadata;
    const reviews = match.context.seoReviews;

    return {
      meta: barbershopSeo(barbershop, metadata),
      links: [
        {
          rel: "canonical",
          href: getCanonicalUrl(`/barbershops/${barbershop?.uuid}`),
        },
      ],
      scripts: [
        ...(barbershop
          ? [
              barbershopStructuredData(barbershop, metadata, reviews),
              breadcrumbStructuredData([
                { name: "Inicio", url: getCanonicalUrl("/") },
                { name: "Barberías", url: getCanonicalUrl("/barbershops") },
                {
                  name: barbershop.name,
                  url: getCanonicalUrl(`/barbershops/${barbershop.uuid}`),
                },
              ]),
            ]
          : []),
      ],
    };
  },
  ssr: true,
});

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();

  const { data: user } = useSession();

  const [_, _setCarouselApi] = useCarouselApi();

  const { data: barbershop } = useBarbershopByUuid(barbershopUuid);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );

  return (
    <BorderContainer>
      <main>
        <Suspense fallback={<Skeleton className="h-32 w-full md:max-w-xs" />}>
          <BarbershopHeader
            barbershop={barbershop}
            userId={user?.userId!}
            availability={barbershop?.availability!}
          />

          {/* <section>
                <BarbershopAvatar barbershop={barbershop} size="lg" />
              </section> */}
        </Suspense>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>

          <Suspense fallback={<ServicesSkeleton />}>
            <ServicesGrid
              services={services}
              barbers={barbershopMembers}
              barbershopId={barbershop?._id!}
            />

            {services?.length < 1 && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No hay servicios disponibles.</EmptyTitle>
                  <EmptyDescription>
                    Cuando se agregue un servicio, podrás verlo aquí.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </Suspense>
        </section>
      </main>
    </BorderContainer>
  );
}
