import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from "@convex-dev/react-query";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";

import { isSaleProofContentType } from "@/lib/inventory-sale-proof";

export type SellableInventoryItem = FunctionReturnType<
  typeof api.inventorySales.listSellableItems
>[number];

export type InventorySaleRow = FunctionReturnType<
  typeof api.inventorySales.listRecent
>[number];

export type SalesMetrics = FunctionReturnType<
  typeof api.inventorySales.getSalesMetrics
>;

export function sellableItemsQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventorySales.listSellableItems, {
    barbershop: { id: barbershopId },
  });
}

export function recentSalesQueryOptions(
  barbershopId: Barbershop["_id"],
  limit = 20,
) {
  return convexQuery(api.inventorySales.listRecent, {
    barbershop: { id: barbershopId },
    limit,
  });
}

export function useSellableItems(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(sellableItemsQueryOptions(barbershopId));
}

export function useRecentSales(barbershopId: Barbershop["_id"], limit = 20) {
  return useSuspenseQuery(recentSalesQueryOptions(barbershopId, limit));
}

export function saleProofUrlQueryOptions(
  barbershopId: Barbershop["_id"],
  saleId: InventorySaleRow["_id"],
) {
  return {
    ...convexQuery(api.inventorySales.getProofUrl, {
      barbershop: { id: barbershopId },
      sale: { id: saleId },
    }),
    // Signed URLs must be minted on every click and discarded immediately.
    staleTime: 0,
    gcTime: 0,
  };
}

export function useInventorySaleProofUrl() {
  const queryClient = useQueryClient();

  return (barbershopId: Barbershop["_id"], saleId: InventorySaleRow["_id"]) =>
    queryClient.query(saleProofUrlQueryOptions(barbershopId, saleId));
}

export function salesMetricsQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.inventorySales.getSalesMetrics, {
    barbershop: { id: barbershopId },
  });
}

export function useSalesMetrics(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(salesMetricsQueryOptions(barbershopId));
}

interface SaleProofClients {
  createProofUpload: ReturnType<
    typeof useConvexMutation<typeof api.inventorySales.createProofUpload>
  >;
  finalizeProofUpload: ReturnType<
    typeof useConvexAction<typeof api.inventorySales.finalizeProofUpload>
  >;
  deleteProof: ReturnType<
    typeof useConvexMutation<typeof api.inventorySales.deleteOrphanProof>
  >;
}

async function uploadSaleProof(
  { createProofUpload, finalizeProofUpload, deleteProof }: SaleProofClients,
  { barbershopId, file }: { barbershopId: Barbershop["_id"]; file: File },
): Promise<string> {
  if (!isSaleProofContentType(file.type)) {
    throw new Error("Solo se permiten imágenes o archivos PDF");
  }

  const { key, url } = await createProofUpload({
    barbershop: { id: barbershopId },
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error("No se pudo subir el comprobante");
    }

    // Awaited on purpose: registerSale cross-checks the synced metadata,
    // and the plain r2 syncMetadata mutation only schedules the sync.
    await finalizeProofUpload({ barbershop: { id: barbershopId }, key });
  } catch (error) {
    try {
      await deleteProof({
        barbershop: { id: barbershopId },
        key,
      });
    } catch {
      // Best-effort cleanup: surface the upload error, not this one.
    }
    throw error;
  }
  return key;
}

export function useInventorySaleActions() {
  const createProofUpload = useConvexMutation(
    api.inventorySales.createProofUpload,
  );
  const finalizeProofUpload = useConvexAction(
    api.inventorySales.finalizeProofUpload,
  );
  const deleteProof = useConvexMutation(api.inventorySales.deleteOrphanProof);

  const registerSaleMutation = useMutation({
    mutationFn: useConvexMutation(api.inventorySales.registerSale),
  });

  const uploadProofMutation = useMutation({
    mutationFn: (variables: { barbershopId: Barbershop["_id"]; file: File }) =>
      uploadSaleProof(
        { createProofUpload, finalizeProofUpload, deleteProof },
        variables,
      ),
  });

  return {
    registerSaleMutation,
    uploadProofMutation,
    deleteProof,
  };
}
