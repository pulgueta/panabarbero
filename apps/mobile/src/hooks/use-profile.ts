// Forms in the mobile app use plain controlled state. The web's TanStack Form
// (`useAppForm`) is not used here.
import { api } from "@panabarbero/backend/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { z } from "zod";

import { useAuth } from "@/providers/auth-provider";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener entre 2 y 60 caracteres.")
  .max(60, "El nombre debe tener entre 2 y 60 caracteres.");

export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\d{10}|\+[1-9]\d{7,14})$/,
    "Escribe 10 dígitos o el número con indicativo, por ejemplo +573001234567.",
  );

/** The caller's profile. `undefined` while loading, `null` when it does not exist yet. */
export function useMyProfile() {
  const { isAuthenticated } = useConvexAuth();
  const userId = useAuth().user?.id;
  return useQuery(
    api.userProfileData.getMyProfile,
    isAuthenticated && userId ? { userId } : "skip",
  );
}

/** Effective schedule of the caller's barber membership. Skipped when `enabled` is false. */
export function useMyBarberSchedule(enabled: boolean) {
  const { isAuthenticated } = useConvexAuth();
  const userId = useAuth().user?.id;
  const member = useQuery(
    api.barbershopMembers.getByUserId,
    enabled && isAuthenticated && userId ? { userId } : "skip",
  );
  return useQuery(
    api.barbershopMembers.getBarberSchedule,
    member ? { barbershopMemberId: member._id } : "skip",
  );
}

export function useProfileActions() {
  const updateName = useMutation(api.userProfileData.updateName);
  const updatePhoneNumber = useMutation(api.userProfileData.updatePhoneNumber);
  const updateNotificationPreference = useMutation(
    api.userProfileData.updateNotificationPreference,
  ).withOptimisticUpdate((localStore, args) => {
    const queryArgs = { userId: args.userId };
    const profile = localStore.getQuery(
      api.userProfileData.getMyProfile,
      queryArgs,
    );
    if (!profile) return;

    const preferences = profile.notificationsPreferences;
    // Mirror the backend, which appends a channel the row does not have yet.
    const next = preferences.some((p) => p.type === args.type)
      ? preferences.map((p) =>
          p.type === args.type ? { ...p, enabled: args.enabled } : p,
        )
      : [...preferences, { type: args.type, enabled: args.enabled }];

    localStore.setQuery(api.userProfileData.getMyProfile, queryArgs, {
      ...profile,
      notificationsPreferences: next,
    });
  });

  return { updateName, updatePhoneNumber, updateNotificationPreference };
}

type EditableFieldOptions = {
  /** The saved value. The field shows it until the user edits. */
  saved: string;
  schema: z.ZodType<string>;
  save: (value: string) => Promise<unknown>;
};

/** Controlled state for one field with its own save button. */
export function useEditableField({
  saved,
  schema,
  save,
}: EditableFieldOptions) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const value = draft ?? saved;
  const isDirty = draft !== null && draft.trim() !== saved;

  const onChangeText = (text: string) => {
    setDraft(text);
    setError(null);
  };

  /** Resolves true when the value was saved. Mutation errors go to the caller. */
  const submit = async () => {
    const result = schema.safeParse(value);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? null);
      return false;
    }
    setIsSaving(true);
    try {
      await save(result.data);
      setDraft(null);
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  return { value, onChangeText, error, isDirty, isSaving, submit };
}
