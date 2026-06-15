import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { clientEnv } from "@/env/client";

export function extractR2Key(url: string | null | undefined): string | null {
  if (!url) return null;

  const base = clientEnv.VITE_STORAGE_URL;
  if (!url.startsWith(base)) return null;

  // Strip the base URL prefix and any trailing slash to get the raw key
  return url.slice(base.length).replace(/^\//, "").replace(/\/$/, "");
}

/**
 * Build the public CDN URL for a given R2 logo key.
 * Returns `null` when there's no key.
 */
export function getLogoUrl(logoKey: string | null | undefined): string | null {
  if (!logoKey) return null;

  return `${clientEnv.VITE_STORAGE_URL}/${logoKey}`;
}

export function useUpload(opts: { type: "profile-photo" | "barbershop-logo" }) {
  const [uploading, setUploading] = useState<boolean>(false);

  const deleteFileMutation = useMutation({
    mutationFn: useConvexMutation(api.r2.deleteR2Object),
  });

  const uploadFile = async (image: File) => {
    setUploading(true);

    try {
      const convexImageUploadUrl = new URL(
        `${clientEnv.VITE_CONVEX_SITE_URL}/upload`,
      );

      convexImageUploadUrl.searchParams.set("type", opts.type);

      const response = await fetch(convexImageUploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": image.type,
        },
        body: image,
      });

      setUploading(false);

      return (await response.json()) as Promise<string>;
    } catch (error) {
      console.error(error);
      throw new Error("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  return {
    deleteFileMutation,
    uploadFile: {
      isUploading: uploading,
      uploadFile,
    },
  } as const;
}
