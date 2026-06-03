import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";

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
