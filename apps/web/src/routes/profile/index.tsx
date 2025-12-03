/** biome-ignore-all lint/style/noNonNullAssertion: We need to assert non-null values because the hooks return undefined if the data is not loaded */
import { signOut } from "@panabarbero/convex/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { AccountTab } from "@/components/profile/account-tab";
import { AppointmentsTab } from "@/components/profile/appointments-tab";
import { ReviewsTab } from "@/components/profile/reviews-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  barbershopByIdQueryOptions,
  useBarbershopsByIds,
} from "@/hooks/barbershop/use-barbershop";
import {
  appointmentsByUserQueryOptions,
  recentlyVisitedBarbershopsQueryOptions,
  useAppointmentsByUser,
  useRecentlyVisitedBarbershops,
} from "@/hooks/use-appointments";
import { isBarberQueryOptions, useIsBarber } from "@/hooks/use-barbers";
import { profileQueryOptions, useProfile } from "@/hooks/use-profile";
import {
  reviewsByUserQueryOptions,
  useReviewsByUser,
} from "@/hooks/use-reviews";
import { getSessionQueryOptions } from "@/hooks/use-session";
import { useState } from "react";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context }) => {
    await context.queryClient.prefetchQuery(getSessionQueryOptions());
  },
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        appointmentsByUserQueryOptions(user.userId),
      );
      await context.queryClient.ensureQueryData(
        reviewsByUserQueryOptions(user.userId),
      );
      const recentlyVisitedBarbershops =
        await context.queryClient.ensureQueryData(
          recentlyVisitedBarbershopsQueryOptions(user.userId),
        );

      if (recentlyVisitedBarbershops) {
        await Promise.all(
          recentlyVisitedBarbershops.map(async (barbershop) => {
            await context.queryClient.ensureQueryData(
              barbershopByIdQueryOptions(barbershop._id),
            );
          }),
        );
      }

      await context.queryClient.ensureQueryData(
        profileQueryOptions(user.userId),
      );
      await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );
    }

    return {
      user,
    };
  },
});

type ProfileTabValue = "account" | "appointments" | "reviews";

function ProfilePage() {
  const { user } = Route.useLoaderData();

  const [activeTab, setActiveTab] = useState<ProfileTabValue>("account");

  const { data: isBarber } = useIsBarber(user?.userId);
  const { data: appointments } = useAppointmentsByUser(user?.userId);
  const { data: reviews } = useReviewsByUser(user?.userId);
  const { data: recentlyVisitedBarbershops } = useRecentlyVisitedBarbershops(
    user?.userId,
  );
  const { data: barbershops } = useBarbershopsByIds(
    appointments?.map((appointment) => appointment.barbershopId),
  );
  const { data: profile } = useProfile(user?.userId);

  const onTabChange = (value: string) => {
    setActiveTab(value as ProfileTabValue);
  };

  const handleSignOut = async () => {
    const { data } = await signOut();

    if (data?.success) {
      throw redirect({
        to: "/login",
      });
    }
  };

  const tabsToRender = [
    {
      value: "account",
      label: "Cuenta",
    },
  ];

  if (!isBarber) {
    tabsToRender.push(
      {
        value: "appointments",
        label: "Citas",
      },
      {
        value: "reviews",
        label: "Reseñas",
      },
    );
  }

  return (
    <BorderContainer className="space-y-6">
      <div className="flex flex-col items-start justify-center gap-4">
        <Button
          variant="destructive"
          onClick={handleSignOut}
          className="min-w-24"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
        <Tabs
          defaultValue="account"
          className="min-w-full"
          onValueChange={onTabChange}
        >
          <TabsList>
            {tabsToRender.map((tabOption) => (
              <TabsTrigger
                key={tabOption.value}
                value={tabOption.value}
                className="min-w-24 max-w-64"
                onClick={() => setActiveTab(tabOption.value as ProfileTabValue)}
              >
                {tabOption.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeTab === "account" && (
            <TabsContent value="account" className="pt-2">
              <AccountTab
                profile={profile}
                isBarber={isBarber}
                userId={user?.userId}
              />
            </TabsContent>
          )}
          {activeTab === "appointments" && (
            <TabsContent value="appointments" className="pt-2">
              <AppointmentsTab
                appointments={appointments}
                barbershops={barbershops}
              />
            </TabsContent>
          )}
          {activeTab === "reviews" && (
            <TabsContent value="reviews" className="pt-2">
              <ReviewsTab
                reviews={reviews}
                barbershops={recentlyVisitedBarbershops}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </BorderContainer>
  );
}
