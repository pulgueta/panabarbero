import { api } from "@convex/_generated/api";
import type { Barbershop, InventoryItem, Service } from "@convex/schema";
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

export function usePaginatedMovements(
  itemId: InventoryItem["_id"],
  cursor: string | null,
  numItems = 10,
) {
  return useQuery(movementsPaginatedQueryOptions(itemId, cursor, numItems));
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
  const recordSaleMutation = useMutation({
    mutationFn: useConvexMutation(api.inventory.recordSale),
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
    recordSaleMutation,
    recordWasteMutation,
    setServiceRecipeMutation,
  };
}
