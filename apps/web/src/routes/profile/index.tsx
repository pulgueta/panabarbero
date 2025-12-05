/** biome-ignore-all lint/style/noNonNullAssertion: We need to assert non-null values because the hooks return undefined if the data is not loaded */
import { signOut } from "@panabarbero/convex/auth";
import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Activity, useState } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { AccountTab } from "@/components/profile/account-tab";
import { AppointmentsTab } from "@/components/profile/appointments-tab";
import { ReviewsTab } from "@/components/profile/reviews-tab";
import { SecurityTab } from "@/components/profile/security-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  barbershopByIdQueryOptions,
  userVisitedBarbershopsQueryOptions,
  useUserVisitedBarbershops,
} from "@/hooks/barbershop/use-barbershop";
import {
  appointmentsByUserQueryOptions,
  useAppointmentsByUser,
} from "@/hooks/use-appointments";
import {
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions, useProfile } from "@/hooks/use-profile";
import {
  reviewsByUserQueryOptions,
  useReviewsByUser,
} from "@/hooks/use-reviews";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
  pendingComponent: LoadingComponent,
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
      const barbershops = await context.queryClient.ensureQueryData(
        userVisitedBarbershopsQueryOptions(user.userId),
      );

      if (barbershops) {
        await Promise.all(
          barbershops.map(async (barbershop) => {
            if (barbershop?._id) {
              await context.queryClient.ensureQueryData(
                barbershopByIdQueryOptions(barbershop._id),
              );
            }
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
  },
});

type ProfileTabValue = "account" | "security" | "appointments" | "reviews";

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTabValue>("account");

  const navigate = Route.useNavigate();

  const { data: user } = useSession();

  const { data: isBarber } = useIsBarber(user?.userId!);
  const { data: appointments } = useAppointmentsByUser(user?.userId!);
  const { data: reviews } = useReviewsByUser(user?.userId!);
  const { data: barbershops } = useUserVisitedBarbershops(user?.userId!);
  const { data: profile } = useProfile(user?.userId!);

  const onTabChange = (value: string) => {
    setActiveTab(value as ProfileTabValue);
  };

  const handleSignOut = async () => {
    await signOut();

    throw navigate({ to: "/login", replace: true });
  };

  const tabsToRender = [
    {
      value: "appointments",
      label: "Citas",
    },
    {
      value: "reviews",
      label: "Reseñas",
    },
    {
      value: "account",
      label: "Cuenta",
    },

    {
      value: "security",
      label: "Seguridad",
    },
  ];

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
                className="min-w-auto md:min-w-32 md:max-w-40"
                onClick={() => setActiveTab(tabOption.value as ProfileTabValue)}
              >
                {tabOption.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Activity mode={activeTab === "account" ? "visible" : "hidden"}>
            <TabsContent value="account" className="pt-2">
              <AccountTab
                profile={profile}
                isBarber={isBarber}
                userId={user?.userId!}
              />
            </TabsContent>
          </Activity>

          <Activity mode={activeTab === "security" ? "visible" : "hidden"}>
            <TabsContent value="security" className="pt-2">
              <SecurityTab profile={profile} />
            </TabsContent>
          </Activity>

          <Activity mode={activeTab === "appointments" ? "visible" : "hidden"}>
            <TabsContent value="appointments" className="pt-2">
              <AppointmentsTab
                appointments={appointments}
                isBarber={isBarber}
              />
            </TabsContent>
          </Activity>

          <Activity mode={activeTab === "reviews" ? "visible" : "hidden"}>
            <TabsContent value="reviews" className="pt-2">
              <ReviewsTab
                reviews={reviews}
                appointments={appointments}
                // @ts-expect-error - barbershops is defined
                barbershops={barbershops}
              />
            </TabsContent>
          </Activity>
        </Tabs>
      </div>
    </BorderContainer>
  );
}
