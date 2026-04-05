import { useUploadFile } from "@convex-dev/r2/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";

import { env } from "@/env";

/**
 * Build the public CDN URL for a given R2 profile photo key.
 * Returns `null` when there's no key.
 */
export function getProfilePhotoUrl(
  photoKey: string | null | undefined,
): string | null {
  if (!photoKey) return null;

  return `${env.VITE_STORAGE_URL}/${photoKey}`;
}

/**
 * Extract the R2 key from a CDN URL if it belongs to our storage.
 * Returns `null` for external URLs (e.g. Google OAuth profile pictures).
 */
function extractR2Key(url: string | null | undefined): string | null {
  if (!url) return null;

  const base = env.VITE_STORAGE_URL;
  if (!url.startsWith(base)) return null;

  // Strip the base URL prefix and any trailing slash to get the raw key
  return url.slice(base.length).replace(/^\//, "").replace(/\/$/, "");
}

/**
 * Hook to upload a profile photo to R2 and persist the URL in Better Auth's user.image.
 * Automatically deletes the previous photo from R2 if it was an R2 URL.
 */
export function useUploadProfilePhoto() {
  const uploadFile = useUploadFile(api.r2);
  const setProfilePhotoKey = useConvexMutation(
    api.userProfileData.setProfilePhotoKey,
  );

  return useMutation({
    mutationFn: async ({
      file,
      previousImageUrl,
      onProgress,
    }: {
      file: File;
      previousImageUrl?: string | null;
      onProgress?: (progress: { loaded: number; total: number }) => void;
    }) => {
      const key = await uploadFile(file, { onProgress });
      const imageUrl = `${env.VITE_STORAGE_URL}/${key}`;
      const previousKey = extractR2Key(previousImageUrl) ?? undefined;

      await setProfilePhotoKey({ imageUrl, previousKey });

      return key;
    },
  });
}

export function useProfilePhotoActions() {
  const removeProfilePhotoMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.removeProfilePhoto),
  });
  const setProfilePhotoKeyMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.setProfilePhotoKey),
  });

  return {
    removeProfilePhotoMutation,
    setProfilePhotoKeyMutation,
  } as const;
}
