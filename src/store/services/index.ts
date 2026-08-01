import type { Service } from "@convex/schema";
import { Store, useStore } from "@tanstack/react-store";

interface ServicesStore {
  /** Selected services, in selection order (no duplicates). */
  services: Service[];
}

const servicesStore = new Store<ServicesStore>({ services: [] });

/** Replace the selection with a single service (staff dropdown, URL seed). */
export function setServiceStore({ service }: { service: Service }) {
  servicesStore.setState(() => ({ services: [service] }));
}

/** Multi-select toggle: add if absent, remove if present; order kept. */
export function toggleService(service: Service) {
  servicesStore.setState((state) => {
    const exists = state.services.some((s) => s._id === service._id);

    return {
      services: exists
        ? state.services.filter((s) => s._id !== service._id)
        : [...state.services, service],
    };
  });
}

export function resetServiceStore() {
  servicesStore.setState(() => ({ services: [] }));
}

export function useServicesStore() {
  return useStore(servicesStore, (state) => state.services);
}

export function useServicesStoreActions() {
  return {
    setServiceStore,
    toggleService,
  };
}
