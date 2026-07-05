import type { Icon } from "@phosphor-icons/react";
import {
  CalendarIcon,
  ChatCircleIcon,
  GearSixIcon,
  PackageIcon,
  ScissorsIcon,
  StarIcon,
  UsersIcon,
} from "@phosphor-icons/react";

export type DashboardRole = "owner" | "staff" | "barber";

/** A nested sub-destination under a top-level nav item. Inherits the parent's roles unless narrowed. */
export interface DashboardNavSubItem {
  label: string;
  to: string;
  roles?: DashboardRole[];
}

export interface DashboardNavItem {
  label: string;
  to: string;
  icon: Icon;
  roles: DashboardRole[];
  /** When present, the item renders as a collapsible parent with a sub-menu. */
  children?: DashboardNavSubItem[];
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
        children: [
          { label: "Barberos", to: "/profile/barbershops/team/barbers" },
          {
            label: "Recepcionistas",
            to: "/profile/barbershops/team/receptionists",
          },
          {
            label: "Invitaciones",
            to: "/profile/barbershops/team/invitations",
          },
        ],
      },
      {
        label: "Reseñas",
        to: "/profile/barbershops/reviews",
        icon: StarIcon,
        roles: ["owner", "staff"],
      },
      {
        label: "Ajustes",
        to: "/profile/barbershops/settings",
        icon: GearSixIcon,
        roles: ["owner"],
        children: [
          { label: "General", to: "/profile/barbershops/settings" },
          {
            label: "Disponibilidad",
            to: "/profile/barbershops/settings/availability",
          },
          {
            label: "Facturación",
            to: "/profile/barbershops/settings/billing",
          },
        ],
      },
    ],
  },
  {
    label: "Asistente",
    items: [
      {
        label: "Pana",
        to: "/profile/barbershops/pana",
        icon: ChatCircleIcon,
        roles: ["owner", "staff", "barber"],
        children: [
          { label: "Chat", to: "/profile/barbershops/pana" },
          {
            label: "Conocimiento",
            to: "/profile/barbershops/pana/knowledge",
          },
          { label: "Memoria", to: "/profile/barbershops/pana/memory" },
        ],
      },
    ],
  },
];

export function getDashboardNavGroups(role: DashboardRole) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.roles.includes(role))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) =>
            (child.roles ?? item.roles).includes(role),
          ),
        })),
    }))
    .filter((group) => group.items.length > 0);
}
