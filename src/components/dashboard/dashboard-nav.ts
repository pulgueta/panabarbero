import type { Icon } from "@phosphor-icons/react";
import {
  CalendarIcon,
  ChatCircleIcon,
  GearSixIcon,
  PackageIcon,
  ScissorsIcon,
  UsersIcon,
} from "@phosphor-icons/react";

export type DashboardRole = "owner" | "staff" | "barber";

export interface DashboardNavItem {
  label: string;
  to: string;
  icon: Icon;
  roles: DashboardRole[];
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

const groups: DashboardNavGroup[] = [
  {
    label: "Operación",
    items: [
      {
        label: "Citas",
        to: "/profile/barbershops/appointments",
        icon: CalendarIcon,
        roles: ["owner", "staff", "barber"],
      },
      {
        label: "Servicios",
        to: "/profile/barbershops/services",
        icon: ScissorsIcon,
        roles: ["owner", "staff"],
      },
      {
        label: "Inventario",
        to: "/profile/barbershops/inventory",
        icon: PackageIcon,
        roles: ["owner", "staff", "barber"],
      },
    ],
  },
  {
    label: "Barbería",
    items: [
      {
        label: "Equipo",
        to: "/profile/barbershops/team",
        icon: UsersIcon,
        roles: ["owner", "staff"],
      },
      {
        label: "Ajustes",
        to: "/profile/barbershops/settings",
        icon: GearSixIcon,
        roles: ["owner"],
      },
    ],
  },
  {
    label: "Asistente",
    items: [
      {
        label: "Pana",
        to: "/chat",
        icon: ChatCircleIcon,
        roles: ["owner", "staff", "barber"],
      },
    ],
  },
];

export function getDashboardNavGroups(role: DashboardRole) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}
