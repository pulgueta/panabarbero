import { api } from "@panabarbero/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Typography, useToast } from "heroui-native";
import { ScrollView, View } from "react-native";

import { AppearancePicker } from "@/components/profile/appearance-picker";
import { BarberScheduleList } from "@/components/profile/barber-schedule-list";
import { PreferenceSwitchRow } from "@/components/profile/preference-switch-row";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { SaveableTextField } from "@/components/profile/saveable-text-field";
import { ListGroup, ListRow } from "@/components/ui/list-group";
import { type Access, useAccess } from "@/hooks/use-access";
import {
  nameSchema,
  phoneSchema,
  useEditableField,
  useMyBarberSchedule,
  useMyProfile,
  useProfileActions,
} from "@/hooks/use-profile";
import { type PushStatus, usePushStatus } from "@/hooks/use-push-registration";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { useAuth } from "@/providers/auth-provider";
import { useThemePreference } from "@/providers/theme-provider";

type Membership = NonNullable<Access["membership"]>;
type NotificationChannel = "email" | "sms" | "push";

/** Highest role wins: owner > staff > barber. */
function roleLabel(membership: Membership) {
  if (membership.isOwner) return "Dueño";
  if (membership.isStaff) return "Recepción";
  return "Barbero";
}

/** QA hint for push setup; `null` while registration runs. */
const pushStatusLabel: Record<PushStatus, string | null> = {
  pending: null,
  active: "Notificaciones push: activas",
  simulator: "Notificaciones push: no disponibles en este dispositivo",
  denied: "Notificaciones push: permiso denegado",
  "no-project-id": "Notificaciones push: pendientes de configuración",
  error: "Notificaciones push: no se pudieron activar",
};

export default function ProfileScreen() {
  const { user: sessionUser, signOut } = useAuth();
  const { toast } = useToast();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const profile = useMyProfile();
  const membership = useAccess()?.membership;
  const schedule = useMyBarberSchedule(membership?.isBarber ?? false);
  const pushLabel = pushStatusLabel[usePushStatus()];
  const { preference, setPreference } = useThemePreference();
  const { updateName, updatePhoneNumber, updateNotificationPreference } =
    useProfileActions();

  const email = profile?.email ?? currentUser?.email ?? sessionUser?.email;
  const name = profile?.name ?? currentUser?.name ?? email ?? "Cargando…";
  const image = profile?.image ?? currentUser?.image;

  const showError = (error: unknown) => {
    toast.show({ variant: "danger", label: getConvexErrorMessage(error) });
  };

  const nameField = useEditableField({
    saved: profile?.name ?? "",
    schema: nameSchema,
    save: (value) => updateName({ name: value }),
  });
  const phoneField = useEditableField({
    saved: profile?.phoneNumber ?? "",
    schema: phoneSchema,
    save: (value) => updatePhoneNumber({ phoneNumber: value }),
  });

  const saveField = async (field: typeof nameField, successMessage: string) => {
    try {
      if (await field.submit()) {
        toast.show({ variant: "success", label: successMessage });
      }
    } catch (error) {
      showError(error);
    }
  };

  const isChannelEnabled = (channel: NotificationChannel) =>
    profile?.notificationsPreferences.find((p) => p.type === channel)
      ?.enabled ?? false;

  // The optimistic update flips the switch at once and Convex rolls it back
  // when the mutation fails.
  const setChannel = (channel: NotificationChannel, enabled: boolean) => {
    if (!sessionUser) return;
    updateNotificationPreference({
      type: channel,
      enabled,
      userId: sessionUser.id,
    }).catch(showError);
  };

  const profileReady = profile !== undefined && profile !== null;

  return (
    // The scrollable is the first child so content runs under the glass chrome.
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 px-4 pt-3 pb-10"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ProfileIdentity
        name={name}
        email={email}
        image={image}
        shopName={membership?.barbershopName}
        roleLabel={membership ? roleLabel(membership) : undefined}
      />

      <ListGroup label="Cuenta">
        <View className="px-4 py-3">
          <SaveableTextField
            label="Nombre"
            value={nameField.value}
            onChangeText={nameField.onChangeText}
            error={nameField.error}
            isDirty={nameField.isDirty}
            isSaving={nameField.isSaving}
            onSave={() => saveField(nameField, "Nombre actualizado")}
            autoComplete="name"
            textContentType="name"
          />
        </View>
        <View className="px-4 py-3">
          <SaveableTextField
            label="Teléfono"
            value={phoneField.value}
            onChangeText={phoneField.onChangeText}
            error={phoneField.error}
            isDirty={phoneField.isDirty}
            isSaving={phoneField.isSaving}
            onSave={() => saveField(phoneField, "Teléfono actualizado")}
            placeholder="Tu número de celular"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
        </View>
      </ListGroup>

      <ListGroup label="Notificaciones">
        <PreferenceSwitchRow
          label="Correo"
          isSelected={isChannelEnabled("email")}
          onSelectedChange={(enabled) => setChannel("email", enabled)}
          isDisabled={!profileReady}
        />
        <PreferenceSwitchRow
          label="SMS"
          description={
            profile?.phoneNumber
              ? undefined
              : "Agrega un teléfono para activarlo."
          }
          isSelected={isChannelEnabled("sms")}
          onSelectedChange={(enabled) => setChannel("sms", enabled)}
          isDisabled={!profileReady || !profile.phoneNumber}
        />
        <PreferenceSwitchRow
          label="Notificaciones push"
          description="Alertas en la app móvil de PanaBarbero."
          isSelected={isChannelEnabled("push")}
          onSelectedChange={(enabled) => setChannel("push", enabled)}
          isDisabled={!profileReady}
        >
          {pushLabel ? (
            <Typography type="body-xs" color="muted">
              {pushLabel}
            </Typography>
          ) : null}
        </PreferenceSwitchRow>
      </ListGroup>

      {membership?.isBarber && schedule ? (
        <BarberScheduleList
          schedule={schedule.schedule}
          isCustom={schedule.isCustom}
        />
      ) : null}

      <ListGroup label="Apariencia">
        <View className="px-4 py-3">
          <AppearancePicker value={preference} onChange={setPreference} />
        </View>
      </ListGroup>

      <ListGroup label="Sesión">
        <ListRow title="Cerrar sesión" destructive onPress={signOut} />
      </ListGroup>
    </ScrollView>
  );
}
