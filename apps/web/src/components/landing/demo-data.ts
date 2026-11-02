import type { Icon } from "@phosphor-icons/react";
import {
  DropIcon,
  EyeIcon,
  KnifeIcon,
  PackageIcon,
  PaintBrushIcon,
  ScissorsIcon,
} from "@phosphor-icons/react";

/**
 * Static sample data for the landing-page product replicas. The dynamic parts
 * (agenda, team, cera stock, Pana chat) live in `landing-sim.ts`; this module
 * keeps the rows the simulation never touches.
 */

export type DemoAppointmentStatus = "nueva" | "pendiente" | "confirmada";

export const DEMO_APPOINTMENT_STATUS: Record<
  DemoAppointmentStatus,
  { label: string; variant: "info" | "warning" | "success" }
> = {
  nueva: { label: "Nueva", variant: "info" },
  pendiente: { label: "Sin confirmar", variant: "warning" },
  confirmada: { label: "Confirmada", variant: "success" },
};

export interface DemoService {
  icon: Icon;
  name: string;
  duration: string;
  price: string;
  /** The last service (Tinte de barba) is toggled live by the simulation. */
  active: boolean;
}

export const DEMO_SERVICES: DemoService[] = [
  {
    icon: ScissorsIcon,
    name: "Corte clásico",
    duration: "30 min",
    price: "$25.000",
    active: true,
  },
  {
    icon: ScissorsIcon,
    name: "Corte + barba",
    duration: "50 min",
    price: "$35.000",
    active: true,
  },
  {
    icon: ScissorsIcon,
    name: "Corte fade",
    duration: "40 min",
    price: "$28.000",
    active: true,
  },
  {
    icon: EyeIcon,
    name: "Cejas + perfilado",
    duration: "15 min",
    price: "$15.000",
    active: true,
  },
  {
    icon: PaintBrushIcon,
    name: "Tinte de barba",
    duration: "35 min",
    price: "$22.000",
    active: false,
  },
];

export const TOGGLED_SERVICE_NAME = "Tinte de barba";

export interface DemoStockItem {
  icon: Icon;
  name: string;
  units: number;
  maxUnits: number;
}

/** "Cera mate" is the live item — its units come from the simulation. */
export const DEMO_INVENTORY: DemoStockItem[] = [
  { icon: PackageIcon, name: "Cera mate", units: 6, maxUnits: 30 },
  { icon: DropIcon, name: "Aceite para barba", units: 18, maxUnits: 24 },
  { icon: PackageIcon, name: "Shampoo de barba", units: 12, maxUnits: 20 },
  { icon: KnifeIcon, name: "Cuchillas desechables", units: 34, maxUnits: 40 },
];

export const LIVE_STOCK_ITEM_NAME = "Cera mate";
