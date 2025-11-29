import type { Barbershop, Service } from "@panabarbero/convex/schemas";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface ServicesStore {
  service: Service;
}

export const servicesStore = new Store<ServicesStore>({
  service: {
    _creationTime: 0,
    _id: "" as unknown as Service["_id"],
    barbershopId: "" as unknown as Barbershop["_id"],
    uuid: "",
    name: "",
    price: 0,
    duration: 0,
  },
});

export function setServiceStore({ service }: ServicesStore) {
  servicesStore.setState(() => ({
    service,
  }));
}

export function useServicesStore() {
  return useStore(servicesStore);
}

export function useServicesStoreActions() {
  return {
    setServiceStore,
  };
}
