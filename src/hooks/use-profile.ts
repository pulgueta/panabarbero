import { api } from "@convex/_generated/api";
import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function profileQueryOptions(userId?: string) {
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
        const hasPreference = existingProfile.notificationsPreferences.some(
          (pref) => pref.type === args.type,
        );
        const updatedPreferences = hasPreference
          ? existingProfile.notificationsPreferences.map((pref) =>
              pref.type === args.type
                ? { ...pref, enabled: args.enabled }
                : pref,
            )
          : [
              ...existingProfile.notificationsPreferences,
              { type: args.type, enabled: args.enabled },
            ];

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
  return {
    updateNameMutation,
    updatePhoneNumberMutation,
    updateNotificationPreferenceMutation,
  };
}

export function useAccountActions() {
  const deleteAccountMutation = useMutation({
    mutationFn: useConvexAction(api.workosOrgs.deleteCurrentUser),
  });
  return { deleteAccountMutation };
}
