import type { Barbershop } from "@convex/schema";
import {
  CaretRightIcon,
  CaretUpDownIcon,
  SignOutIcon,
  StorefrontIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@workos/authkit-tanstack-react-start/client";
import { type FC, type ReactElement, useState } from "react";
import { useActiveRoute } from "@/components/layout/nav/use-active-route";
import { ThemeToggler } from "@/components/layout/theme-toggler";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useBarbershopPlan } from "@/hooks/billing/use-plan";
import { cn, getInitials } from "@/lib/utils";
import type { DashboardNavItem, DashboardRole } from "./dashboard-nav";
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
  // Longest-prefix-wins across items AND their children, so a sub-route lights
  // up its own entry (not just the parent).
  const activeTo = useActiveRoute(
    groups.flatMap((group) =>
      group.items.flatMap((item) => [
        { to: item.to },
        ...(item.children ?? []).map((child) => ({ to: child.to })),
      ]),
    ),
  );

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
                {group.items.map((item) => (
                  <DashboardNavEntry
                    key={item.to}
                    activeTo={activeTo}
                    isMobile={isMobile}
                    item={item}
                  />
                ))}
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

interface DashboardNavEntryProps {
  item: DashboardNavItem;
  activeTo: string | undefined;
  isMobile: boolean;
}

const DashboardNavEntry: FC<DashboardNavEntryProps> = ({
  item,
  activeTo,
  isMobile,
}) => {
  const Icon = item.icon;
  const children = item.children ?? [];
  const isSelfActive = activeTo === item.to;
  const hasActiveChild = children.some((child) => child.to === activeTo);
  const isActive = isSelfActive || hasActiveChild;

  const [open, setOpen] = useState(isActive);
  // Re-open the group when its entry becomes active after mount (e.g. a
  // navigation into a nested route while the group was collapsed).
  const [wasActive, setWasActive] = useState(isActive);
  if (isActive !== wasActive) {
    setWasActive(isActive);
    if (isActive) setOpen(true);
  }

  if (children.length === 0) {
    return (
      <SidebarMenuItem>
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
  }

  return (
    <Collapsible
      onOpenChange={setOpen}
      open={open}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            className="data-active:text-sidebar-primary"
            isActive={isActive}
            tooltip={item.label}
          />
        }
      >
        <Icon weight={isActive ? "fill" : "bold"} />
        <span>{item.label}</span>
        <CaretRightIcon
          className={cn(
            "ml-auto size-4 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {children.map((child) => {
            const childActive = activeTo === child.to;
            return (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton
                  isActive={childActive}
                  render={closeOnMobile(
                    isMobile,
                    <Link
                      aria-current={childActive ? "page" : undefined}
                      to={child.to}
                      viewTransition={{ types: ["dashboard-nav"] }}
                    />,
                  )}
                >
                  <span>{child.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
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
                  className="size-full justify-start"
                  size="sm"
                  variant="ghost"
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
