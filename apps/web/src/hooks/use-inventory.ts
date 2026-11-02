import { api } from "@convex/_generated/api";
import type {
  Barbershop,
  InventoryItem,
  InventoryMovementType,
  Service,
} from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";

export type InventoryOverviewRow = FunctionReturnType<
  typeof api.inventory.getInventoryOverview
>["rows"][number];

export type InventoryMovementRow = FunctionReturnType<
  typeof api.inventory.listMovements
>["page"][number];

export type ArchivedInventoryRow = FunctionReturnType<
  typeof api.inventory.listArchivedItems
>[number];

export type InventoryItemAuditEvent = FunctionReturnType<
  typeof api.log.getInventoryItemHistory
>[number];

export function inventoryOverviewQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventory.getInventoryOverview, {
    barbershop: { id: barbershopId },
  });
}

export function archivedInventoryQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventory.listArchivedItems, {
    barbershop: { id: barbershopId },
  });
}

export function inventoryItemQueryOptions(itemId: InventoryItem["_id"]) {
  return convexQuery(api.inventory.getItem, {
    item: { id: itemId },
  });
}

export function inventoryItemAuditQueryOptions(
  itemId: InventoryItem["_id"],
  limit = 20,
) {
  return convexQuery(api.log.getInventoryItemHistory, {
    item: { id: itemId },
    limit,
  });
}

export function lowStockQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventory.listLowStock, {
    barbershop: { id: barbershopId },
  });
}

export function valuationQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventory.getValuation, {
    barbershop: { id: barbershopId },
  });
}

export function monthlyConsumptionQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.inventory.getMonthlyConsumption, {
    barbershop: { id: barbershopId },
  });
}

export function serviceRecipeQueryOptions(serviceId: Service["_id"]) {
  return convexQuery(api.inventory.getServiceRecipe, {
    service: { id: serviceId },
  });
}

export function serviceSupplyCountsQueryOptions(
  barbershopId: Barbershop["_id"],
  enabled = true,
) {
  return convexQuery(
    api.inventory.getServiceSupplyCounts,
    enabled ? { id: barbershopId } : "skip",
  );
}

export function movementsPaginatedQueryOptions(
  itemId: InventoryItem["_id"],
  cursor: string | null = null,
  numItems = 10,
) {
  return convexQuery(api.inventory.listMovements, {
    item: { id: itemId },
    paginationOpts: {
      cursor,
      numItems,
    },
  });
}

export function movementTrendQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventory.getMovementTrend, {
    barbershop: { id: barbershopId },
  });
}

/** Server-side ledger filters. Every field is index-backed in `listShopMovements`. */
export type MovementFilters = {
  type?: InventoryMovementType;
  itemId?: InventoryItem["_id"];
  actorUserId?: string;
  startTime?: number;
  endTime?: number;
};

/** Drop undefined keys so an unfiltered call keys identically to the loader prefetch. */
function pruneFilters(filters: MovementFilters): MovementFilters {
  const entries = Object.entries(filters).filter(
    ([, value]) => value !== undefined,
  );

  return Object.fromEntries(entries);
}

export function shopMovementsPaginatedQueryOptions(
  barbershopId: Barbershop["_id"],
  cursor: string | null = null,
  numItems = 10,
  filters?: MovementFilters,
) {
  const active = filters ? pruneFilters(filters) : {};

  return convexQuery(api.inventory.listShopMovements, {
    barbershop: { id: barbershopId },
    paginationOpts: {
      cursor,
      numItems,
    },
    ...(Object.keys(active).length > 0 ? { filters: active } : {}),
  });
}

export function useInventoryOverview(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(inventoryOverviewQueryOptions(barbershopId));
}

export function useArchivedInventory(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(archivedInventoryQueryOptions(barbershopId));
}

export function useInventoryItem(itemId: InventoryItem["_id"]) {
  return useSuspenseQuery(inventoryItemQueryOptions(itemId));
}

export function useInventoryItemAudit(
  itemId: InventoryItem["_id"],
  limit = 20,
) {
  return useQuery(inventoryItemAuditQueryOptions(itemId, limit));
}

export function useLowStock(barbershopId: Barbershop["_id"]) {
  return useQuery(lowStockQueryOptions(barbershopId));
}

export function useValuation(barbershopId: Barbershop["_id"]) {
  return useQuery(valuationQueryOptions(barbershopId));
}

export function useMonthlyConsumption(barbershopId: Barbershop["_id"]) {
  return useQuery(monthlyConsumptionQueryOptions(barbershopId));
}

export function useServiceRecipe(serviceId: Service["_id"]) {
  return useQuery(serviceRecipeQueryOptions(serviceId));
}

export function useServiceSupplyCounts(
  barbershopId: Barbershop["_id"],
  enabled = true,
) {
  return useQuery(serviceSupplyCountsQueryOptions(barbershopId, enabled));
}

export function usePaginatedMovements(
  itemId: InventoryItem["_id"],
  cursor: string | null,
  numItems = 10,
) {
  return useQuery(movementsPaginatedQueryOptions(itemId, cursor, numItems));
}

export function useMovementTrend(barbershopId: Barbershop["_id"]) {
  return useQuery(movementTrendQueryOptions(barbershopId));
}

export function usePaginatedShopMovements(
  barbershopId: Barbershop["_id"],
  cursor: string | null,
  numItems = 10,
  filters?: MovementFilters,
) {
  return useQuery(
    shopMovementsPaginatedQueryOptions(barbershopId, cursor, numItems, filters),
  );
}

export function useInventoryActions() {
  const createItemMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.createItem),
  });
  const updateItemMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.updateItem),
  });
  const archiveItemMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.archiveItem),
  });
  const restoreItemMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.restoreItem),
  });
  const receiveStockMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.receiveStock),
  });
  const adjustStockMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.adjustStock),
  });
  const recordConsumptionMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.recordConsumption),
  });
  const recordWasteMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.recordWaste),
  });
  const setServiceRecipeMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.setServiceRecipe),
  });

  return {
    createItemMutation,
    updateItemMutation,
    archiveItemMutation,
    restoreItemMutation,
    receiveStockMutation,
    adjustStockMutation,
    recordConsumptionMutation,
    recordWasteMutation,
    setServiceRecipeMutation,
  };
}
