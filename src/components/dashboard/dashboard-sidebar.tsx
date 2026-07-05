import type { Barbershop } from "@convex/schema";
import {
  CaretUpDownIcon,
  SignOutIcon,
  StorefrontIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@workos/authkit-tanstack-react-start/client";
import type { FC, ReactElement } from "react";
import { useActiveRoute } from "@/components/layout/nav/use-active-route";
import { ThemeToggler } from "@/components/layout/theme-toggler";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DrawerClose } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useBarbershopPlan } from "@/hooks/billing/use-plan";
import { getInitials } from "@/lib/utils";
import type { DashboardRole } from "./dashboard-nav";
import { getDashboardNavGroups } from "./dashboard-nav";

const PLAN_LABELS = {
  free: "Plan gratis",
  pro: "Plan Pro",
  premium: "Plan Premium",
} as const;

// Every sidebar link renders through this so the mobile drawer closes on
// navigation via Base UI's own Close composition — no onClick wiring.
const closeOnMobile = (isMobile: boolean, link: ReactElement) =>
  isMobile ? <DrawerClose nativeButton={false} render={link} /> : link;

interface DashboardUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface DashboardSidebarProps {
  role: DashboardRole;
  barbershop: Barbershop | null | undefined;
  user: DashboardUser | null | undefined;
}

export const DashboardSidebar: FC<DashboardSidebarProps> = ({
  role,
  barbershop,
  user,
}) => {
  const { isMobile } = useSidebar();

  const groups = getDashboardNavGroups(role);
  const activeTo = useActiveRoute(groups.flatMap((group) => group.items));

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {barbershop ? (
              <SidebarMenuButton
                render={closeOnMobile(
                  isMobile,
                  <Link
                    params={{ barbershopUuid: barbershop.uuid }}
                    to="/barbershops/$barbershopUuid"
                  />,
                )}
                size="lg"
                tooltip={barbershop.name}
              >
                <ShopTile name={barbershop.name} />
                <span className="grid flex-1 leading-tight">
                  <span className="truncate font-semibold text-sm">
                    {barbershop.name}
                  </span>
                  <ShopPlanLabel barbershopId={barbershop._id} />
                </span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton disabled size="lg" tooltip="Mi barbería">
                <ShopTile name={null} />
                <span className="truncate font-semibold text-sm">
                  Mi barbería
                </span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = activeTo === item.to;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        className="data-active:text-sidebar-primary"
                        isActive={isActive}
                        render={closeOnMobile(
                          isMobile,
                          <Link
                            aria-current={isActive ? "page" : undefined}
                            to={item.to}
                            viewTransition={{ types: ["dashboard-nav"] }}
                          />,
                        )}
                        tooltip={item.label}
                      >
                        <Icon weight={isActive ? "fill" : "bold"} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <DashboardUserMenu user={user} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

const ShopTile: FC<{ name: string | null }> = ({ name }) => (
  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-contrast text-contrast-foreground">
    {name ? (
      <span className="font-semibold text-sm uppercase">{name.charAt(0)}</span>
    ) : (
      <StorefrontIcon className="size-4" />
    )}
  </span>
);

const ShopPlanLabel: FC<{ barbershopId: Barbershop["_id"] }> = ({
  barbershopId,
}) => {
  const { planTier } = useBarbershopPlan(barbershopId);

  return (
    <span className="truncate text-muted-foreground text-xs">
      {PLAN_LABELS[planTier]}
    </span>
  );
};

const DashboardUserMenu: FC<{ user: DashboardUser }> = ({ user }) => {
  const { signOut } = useAuth();
  const { isMobile } = useSidebar();

  const initials = getInitials(user.name, user.email);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" tooltip="Cuenta" />}
          >
            <Avatar className="size-8">
              <AvatarImage
                alt={user.name ?? user.email}
                src={user.image ?? undefined}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 leading-tight">
              <span className="truncate font-medium text-sm">{user.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                {user.email}
              </span>
            </span>
            <CaretUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56" side="top">
            <DropdownMenuItem
              render={closeOnMobile(
                isMobile,
                <Link search={{ tab: "account" }} to="/profile" />,
              )}
            >
              <UserIcon />
              Mi perfil
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              render={
                <ThemeToggler
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                />
              }
            />

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => void signOut()}
              variant="destructive"
            >
              <SignOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
