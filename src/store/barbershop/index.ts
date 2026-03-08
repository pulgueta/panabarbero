import type { Barbershop } from "@convex/schema";
import { Store, useStore } from "@tanstack/react-store";
import type { Id } from "convex/_generated/dataModel";

export const barbershopStore = new Store<Barbershop>({
  _creationTime: 0,
  _id: "" as unknown as Id<"barbershops">,
  address: {
    fullAddress: "",
    details: "",
  },
  coordinates: {
    x: 0,
    y: 0,
  },
  contactPhone: "",
  gracePeriodMinutes: 0,
  isActive: false,
  name: "",
  ownerId: "",
  services: [],
  state: "",
  city: "",
  zipCode: "",
  bannerUrl: "",
  description: "",
  metadata: {
    completedAppointments: 0,
    rating: 0,
    reviews: 0,
  },
  availability: [],
  uuid: "",
});

export function useBarbershop() {
  return useStore(barbershopStore);
}
