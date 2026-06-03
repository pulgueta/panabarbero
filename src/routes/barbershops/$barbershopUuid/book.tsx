/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { z } from "zod";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ServicesSkeleton } from "@/components/layout/skeleton/services-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barbershopAvailabilityQueryOptions,
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
import { cn } from "@/lib/utils";
import { resetServiceStore, setServiceStore } from "@/store/services";

const CustomerBookingForm = lazy(() =>
  import("@/components/appointments/customer-booking-form").then((module) => ({
    default: module.CustomerBookingForm,
  })),
);

const searchSchema = z.object({
  serviceId: z.string().optional(),
});

export const Route = createFileRoute("/barbershops/$barbershopUuid/book")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  validateSearch: searchSchema,
  ssr: true,
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context, params }) => {
    const [user, barbershop] = await Promise.all([
      context.queryClient.ensureQueryData(getSessionQueryOptions()),
      context.queryClient.ensureQueryData(
        barbershopByUuidQueryOptions(params.barbershopUuid),
      ),
    ]);

    if (user?.userId) {
      await Promise.all([
        context.queryClient.ensureQueryData(profileQueryOptions(user.userId)),
        context.queryClient.ensureQueryData(
          barberByUserIdQueryOptions(user.userId),
        ),
      ]);
    }

    if (barbershop?._id) {
      const [, barbershopMembers] = await Promise.all([
        context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        ),
        context.queryClient.ensureQueryData(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        ),
        context.queryClient.ensureQueryData(
          barbershopAvailabilityQueryOptions(barbershop._id),
        ),
      ]);

      if (barbershopMembers.length > 0) {
        await Promise.all(
          barbershopMembers.map((member) =>
            context.queryClient.ensureQueryData(
              servicesForBarberQueryOptions(member._id),
            ),
          ),
        );
      }
    }
  },
});

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();
  const { serviceId } = Route.useSearch();

  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByUuid(barbershopUuid);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );

  const barbers =
    barbershopMembers?.filter((m) => m?.roles?.includes("barber")) ?? [];

  // Initialize the services store from the URL search param
  useEffect(() => {
    if (!serviceId || !services?.length) return;
    const match = services.find((s) => s._id === serviceId);
    if (match) setServiceStore({ service: match });
  }, [serviceId, services]);

  // Reset store on unmount to prevent stale state leaking into other contexts
  useEffect(() => {
    return () => resetServiceStore();
  }, []);

  return (
    <BorderContainer>
      <main className="mx-auto w-full max-w-2xl space-y-6 pb-8">
        <Link
          to="/barbershops/$barbershopUuid"
          params={{ barbershopUuid }}
          className={cn(
            buttonVariants({ variant: "link" }),
            "-ml-1 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Volver a la barbería
        </Link>

        {barbershop ? (
          <section>
            <header className="">
              <h3 className="mb-4 text-balance font-semibold text-3xl tracking-tightest">
                {barbershop.name}
              </h3>
              <p className="text-xl">Reservar cita</p>
              <CardDescription>
                {user
                  ? "Elige servicio, fecha y hora. Te confirmamos los detalles al final."
                  : "Debes iniciar sesión para poder reservar."}
              </CardDescription>
            </header>
            <section className="pt-6 sm:pt-8">
              <Suspense
                fallback={
                  <div className="space-y-6">
                    <ServicesSkeleton />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </div>
                }
              >
                <CustomerBookingForm
                  barbershop={barbershop}
                  services={services ?? []}
                  barbers={barbers}
                  initialServiceId={
                    serviceId as (typeof services)[0]["_id"] | undefined
                  }
                />
              </Suspense>
            </section>
          </section>
        ) : (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        )}
      </main>
    </BorderContainer>
  );
}
