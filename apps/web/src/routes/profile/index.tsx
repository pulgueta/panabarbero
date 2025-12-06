/** biome-ignore-all lint/style/noNonNullAssertion: We need to assert non-null values because the hooks return undefined if the data is not loaded */
import { signOut } from "@panabarbero/convex/auth";
import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Activity, Suspense, useState } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { AccountTab } from "@/components/profile/account-tab";
import { AppointmentsTab } from "@/components/profile/appointments-tab";
import { SecurityTab } from "@/components/profile/security-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  appointmentsByUserQueryOptions,
  useAppointmentsByUser,
} from "@/hooks/use-appointments";
import {
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions, useProfile } from "@/hooks/use-profile";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

type ProfileTabValue = "account" | "security" | "appointments" | "reviews";

type ProfileSearch = {
  tab: ProfileTabValue;
};

const tabs = {
  account: {
    label: "Cuenta",
    value: "account",
  },
  security: {
    label: "Seguridad",
    value: "security",
  },
  appointments: {
    label: "Citas",
    value: "appointments",
  },
  reviews: {
    label: "Reseñas",
    value: "reviews",
  },
};

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
  pendingComponent: LoadingComponent,
  validateSearch: (search: Record<string, ProfileTabValue>): ProfileSearch => {
    return {
      tab: search.tab,
    };
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
        profileQueryOptions(user.userId),
      );
      await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );
    }
  },
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const [activeTab, setActiveTab] = useState<ProfileTabValue>(tab);

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId!);
  const { data: appointments, isLoading: isLoadingAppointments } =
    useAppointmentsByUser(user?.userId!);
  const { data: profile, isLoading: isLoadingProfile } = useProfile(
    user?.userId!,
  );

  const onTabChange = (value: string) => {
    setActiveTab(value as ProfileTabValue);
    navigate({ to: "/profile", search: { tab: value as ProfileTabValue } });
  };

  const handleSignOut = async () => {
    await signOut();

    throw navigate({ to: "/login", replace: true });
  };

  const tabsToRender = [
    {
      ...tabs.appointments,
    },
    {
      ...tabs.account,
    },
    {
      ...tabs.security,
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
          defaultValue={
            tab ?? (isBarber ? tabs.account.value : tabs.appointments.value)
          }
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

          <Suspense fallback={<ProfileTabSkeleton />}>
            <Activity
              mode={
                activeTab === tabs.account.value && !isLoadingProfile
                  ? "visible"
                  : "hidden"
              }
            >
              <TabsContent value={tabs.account.value} className="pt-2">
                <AccountTab
                  profile={profile}
                  isBarber={isBarber}
                  userId={user?.userId!}
                />
              </TabsContent>
            </Activity>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <Activity
              mode={
                activeTab === tabs.security.value && !isLoadingProfile
                  ? "visible"
                  : "hidden"
              }
            >
              <TabsContent value={tabs.security.value} className="pt-2">
                <SecurityTab profile={profile} />
              </TabsContent>
            </Activity>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <Activity
              mode={
                activeTab === tabs.appointments.value && !isLoadingAppointments
                  ? "visible"
                  : "hidden"
              }
            >
              <TabsContent value={tabs.appointments.value} className="pt-2">
                <AppointmentsTab
                  appointments={appointments}
                  isBarber={isBarber}
                />
              </TabsContent>
            </Activity>
          </Suspense>

          {/* <Activity mode={activeTab === "reviews" ? "visible" : "hidden"}>
            <TabsContent value="reviews" className="pt-2">
              <ReviewsTab
                reviews={reviews}
                appointments={appointments}
                // @ts-expect-error - barbershops is defined
                barbershops={barbershops}
              />
            </TabsContent>
          </Activity> */}
        </Tabs>
      </div>
    </BorderContainer>
  );
}
