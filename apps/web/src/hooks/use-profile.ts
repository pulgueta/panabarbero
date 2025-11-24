import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export function getProfileQueryOptions(userId: string) {
  return convexQuery(api.userProfileData.getMyProfile, {
    userId,
  });
}

export function useProfile(userId: string) {
  return useQuery(getProfileQueryOptions(userId));
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
    ).withOptimisticUpdate((prev, newData) => {
      return {
        ...prev,
        notificationsPreferences: newData,
      };
    }),
  });

  return {
    updateNameMutation,
    updateEmailMutation,
    updatePhoneNumberMutation,
    updateNotificationPreferenceMutation,
  };
}
