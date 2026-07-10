import type { Icon } from "@phosphor-icons/react";
import {
  CalendarIcon,
  ChartBarIcon,
  ChatCircleIcon,
  ClockIcon,
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
        label: "Analíticas",
        to: "/profile/barbershops/analytics",
        icon: ChartBarIcon,
        roles: ["owner", "staff"],
      },
      {
        label: "Citas",
        to: "/profile/barbershops/appointments",
        icon: CalendarIcon,
        roles: ["owner", "staff", "barber"],
      },
      {
        // Read-only self-schedule for the barber role. Owners/staff edit
        // schedules per barber under Equipo → Barberos, so this stays
        // barber-only to fill the gap where a plain barber has no other view.
        label: "Mi horario",
        to: "/profile/barbershops/schedule",
        icon: ClockIcon,
        roles: ["barber"],
      },
      {
        label: "Inventario",
        to: "/profile/barbershops/inventory",
        icon: PackageIcon,
        roles: ["owner", "staff"],
        children: [
          {
            label: "Resumen",
            to: "/profile/barbershops/inventory",
            roles: ["owner", "staff"],
          },
          {
            label: "Productos",
            to: "/profile/barbershops/inventory/products",
          },
          {
            label: "Movimientos",
            to: "/profile/barbershops/inventory/movements",
            roles: ["owner", "staff"],
          },
        ],
      },
      {
        label: "Reseñas",
        to: "/profile/barbershops/reviews",
        icon: StarIcon,
        roles: ["owner", "staff"],
      },
    ],
  },
  {
    label: "Barbería",
    items: [
      {
        label: "Servicios",
        to: "/profile/barbershops/services",
        icon: ScissorsIcon,
        roles: ["owner", "staff"],
      },
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
        // The parent is widened to staff so the staff-visible children below
        // survive `getDashboardNavGroups` (it filters parents before
        // children); everything owner-only narrows explicitly.
        label: "Ajustes",
        to: "/profile/barbershops/settings",
        icon: GearSixIcon,
        roles: ["owner", "staff"],
        children: [
          {
            label: "General",
            to: "/profile/barbershops/settings",
            roles: ["owner"],
          },
          {
            label: "Disponibilidad",
            to: "/profile/barbershops/settings/availability",
            roles: ["owner"],
          },
          {
            label: "Redes sociales",
            to: "/profile/barbershops/settings/social",
          },
          {
            label: "Facturación",
            to: "/profile/barbershops/settings/billing",
            roles: ["owner"],
          },
          {
            label: "Ubicación",
            to: "/profile/barbershops/settings/location",
            roles: ["owner"],
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
        // children: [
        //   { label: "Chat", to: "/profile/barbershops/pana" },
        //   {
        //     label: "Conocimiento",
        //     to: "/profile/barbershops/pana/knowledge",
        //     roles: ["owner", "staff"],
        //   },
        //   {
        //     label: "Memoria",
        //     to: "/profile/barbershops/pana/memory",
        //     roles: ["owner", "staff"],
        //   },
        // ],
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
