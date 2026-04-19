import type { Barbershop, Service } from "@convex/schema";
import { Store, useStore } from "@tanstack/react-store";

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

export const emptyService: Service = {
  _creationTime: 0,
  _id: "" as unknown as Service["_id"],
  barbershopId: "" as unknown as Barbershop["_id"],
  uuid: "",
  name: "",
  price: 0,
  duration: 0,
};

export function setServiceStore({ service }: ServicesStore) {
  servicesStore.setState(() => ({
    service,
  }));
}

export function resetServiceStore() {
  servicesStore.setState(() => ({ service: emptyService }));
}

export function useServicesStore() {
  return useStore(servicesStore, (state) => state.service);
}

export function useServicesStoreActions() {
  return {
    setServiceStore,
  };
}
