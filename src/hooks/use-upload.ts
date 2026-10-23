import { useState } from "react";
import { z } from "zod";

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

type UploadType = "profile-photo" | "barbershop-logo" | "inventory-item";

/** The `/upload` HTTP action responds with the stored R2 key as JSON. */
const uploadKeySchema = z.string();

async function uploadImage(
  type: UploadType,
  image: File,
  setUploading: (uploading: boolean) => void,
): Promise<string> {
  setUploading(true);

  try {
    const convexImageUploadUrl = new URL(
      `${clientEnv.VITE_CONVEX_SITE_URL}/upload`,
    );

    convexImageUploadUrl.searchParams.set("type", type);

    const response = await fetch(convexImageUploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": image.type,
      },
      body: image,
    });

    setUploading(false);

    return uploadKeySchema.parse(await response.json());
  } catch (error) {
    console.error(error);
    throw new Error("Error al subir el archivo", { cause: error });
  } finally {
    setUploading(false);
  }
}

export function useUpload(opts: { type: UploadType }) {
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadFile = (image: File) =>
    uploadImage(opts.type, image, setUploading);

  return {
    uploadFile: {
      isUploading: uploading,
      uploadFile,
    },
  } as const;
}
