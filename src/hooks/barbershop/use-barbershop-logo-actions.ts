import { useUploadFile } from "@convex-dev/r2/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { env } from "@/env";

/**
 * Build the public CDN URL for a given R2 logo key.
 * Returns `null` when there's no key.
 */
export function getLogoUrl(logoKey: string | null | undefined): string | null {
  if (!logoKey) return null;

  return `${env.VITE_STORAGE_URL}/${logoKey}`;
}

/**
 * Hook to upload a barbershop logo to R2 and persist the key in metadata.
 * Automatically deletes the previous logo on the server side.
 */
export function useUploadBarbershopLogo() {
  const uploadFile = useUploadFile(api.r2);
  const setLogoKey = useConvexMutation(api.barbershopMetadata.setLogoKey);

  return useMutation({
    mutationFn: async ({
      file,
      barbershopId,
      userId,
      onProgress,
    }: {
      file: File;
      barbershopId: Id<"barbershops">;
      userId: string;
      onProgress?: (progress: { loaded: number; total: number }) => void;
    }) => {
      const key = await uploadFile(file, { onProgress });

      return await setLogoKey({
        barbershopId,
        logoKey: key,
        userId,
      });
    },
  });
}

/**
 * Hook to remove the barbershop logo from R2 and clear the key in metadata.
 */
export function useRemoveBarbershopLogo() {
  const removeLogoKey = useConvexMutation(api.barbershopMetadata.removeLogoKey);

  return useMutation({
    mutationFn: async ({
      barbershopId,
      userId,
    }: {
      barbershopId: Id<"barbershops">;
      userId: string;
    }) => {
      await removeLogoKey({
        barbershopId,
        userId,
      });
    },
  });
}
