import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function profileQueryOptions(userId: string) {
  return convexQuery(api.userProfileData.getMyProfile, {
    userId,
  });
}

export function useProfile(userId: string) {
  return useSuspenseQuery(profileQueryOptions(userId));
}

export function useProfileActions() {
  const updateNameMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.updateName),
  });
  const updateEmailMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.updateEmail),
  });
  const updatePhoneNumberMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.updatePhoneNumber),
  });
  const updateNotificationPreferenceMutation = useMutation({
    mutationFn: useConvexMutation(
      api.userProfileData.updateNotificationPreference,
    ).withOptimisticUpdate((localStore, args) => {
      const existingProfile = localStore.getQuery(
        api.userProfileData.getMyProfile,
        {
          userId: args.userId,
        },
      );

      if (existingProfile) {
        const updatedPreferences = existingProfile.notificationsPreferences.map(
          (pref) =>
            pref.type === args.type ? { ...pref, enabled: args.enabled } : pref,
        );

        localStore.setQuery(
          api.userProfileData.getMyProfile,
          { userId: args.userId },
          {
            ...existingProfile,
            notificationsPreferences: updatedPreferences,
          },
        );
      }
    }),
  });
  const setProfilePhotoKeyMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.setProfilePhotoKey),
  });
  const removeProfilePhotoMutation = useMutation({
    mutationFn: useConvexMutation(api.userProfileData.removeProfilePhoto),
  });
  const generateUploadUrlMutation = useMutation({
    mutationFn: useConvexMutation(api.index.generateUploadUrl),
  });

  return {
    updateNameMutation,
    updateEmailMutation,
    updatePhoneNumberMutation,
    updateNotificationPreferenceMutation,
    setProfilePhotoKeyMutation,
    removeProfilePhotoMutation,
    generateUploadUrlMutation,
  };
}
