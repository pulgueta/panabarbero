import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { usePreventRemove } from "expo-router";
import {
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  Separator,
  TextArea,
  TextField,
  Typography,
  useThemeColor,
  useToast,
} from "heroui-native";
import { CheckIcon } from "phosphor-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { z } from "zod";

import { ConfirmDialog } from "@/components/agenda/confirm-dialog";
import { Calendar } from "@/components/ui/calendar";
import { SlotGrid } from "@/components/ui/slot-grid";
import type { Access } from "@/hooks/use-access";
import {
  useClosedDays,
  useShopMembers,
  useSlotsFor,
} from "@/hooks/use-appointments";
import {
  useBarberIdsForServices,
  useBookableServices,
  useCreateAppointment,
} from "@/hooks/use-create-appointment";
import { formatCop, servicePriceLabel } from "@/lib/appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";

const tabularNums = { fontVariant: ["tabular-nums" as const] };
const sectionTitle = { fontSize: 13, lineHeight: 18 };

// Same limits and copy as the web form schema (apps/web/src/lib/schemas.ts).
const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre del cliente debe tener al menos 3 caracteres")
    .max(255, "El nombre del cliente debe tener menos de 255 caracteres"),
  phone: z
    .string()
    .trim()
    .min(8, "Introduce un número de teléfono válido")
    .max(22, "Introduce un número de teléfono válido"),
  email: z.email("Introduce un correo válido").or(z.literal("")),
  notes: z.string(),
});

type Customer = z.infer<typeof customerSchema>;
type CustomerField = keyof Customer;
type Membership = NonNullable<Access["membership"]>;

type CreateAppointmentFormProps = {
  membership: Membership;
  onSuccess: () => void;
};

/** Staff-side booking for a customer: services, barber, day, slot, contact. */
export function CreateAppointmentForm({
  membership,
  onSuccess,
}: CreateAppointmentFormProps) {
  const { toast } = useToast();
  const create = useCreateAppointment();
  const { barbershopId } = membership;
  // A plain barber books for themself; owners and reception choose.
  const isPlainBarber =
    membership.isBarber && !membership.isOwner && !membership.isStaff;

  const [serviceIds, setServiceIds] = useState<Id<"services">[]>([]);
  const [memberId, setMemberId] = useState<Id<"barbershopMembers">>();
  const [dayMs, setDayMs] = useState<number>();
  const [minutes, setMinutes] = useState<number>();
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [droppedServices, setDroppedServices] = useState(false);
  // The sole barber gets picked for the user; only a tap counts as an edit.
  const [barberPicked, setBarberPicked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // The blocked navigation to replay once the user confirms the discard.
  const [discard, setDiscard] = useState<(() => void) | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const barberId = isPlainBarber ? membership.memberId : memberId;
  const services = useBookableServices(barbershopId, barberId);
  const { members } = useShopMembers(isPlainBarber ? undefined : barbershopId);
  const barberIds = useBarberIdsForServices(serviceIds);
  // Until a service is chosen (or while the narrowing loads) every barber shows.
  const barbers = members?.filter(
    (member) => barberIds === undefined || barberIds.includes(member._id),
  );
  const isClosedDay = useClosedDays(barbershopId, barberId);
  const slots = useSlotsFor({
    barbershopId,
    memberId: barberId,
    serviceIds,
    dayMs,
  });

  // Like the web: the only barber who performs the chosen services is picked
  // for the user, and a barber the services narrowed away is dropped.
  useEffect(() => {
    if (isPlainBarber || barbers === undefined) return;
    if (memberId && !barbers.some((barber) => barber._id === memberId)) {
      setMemberId(undefined);
      setMinutes(undefined);
    } else if (!memberId && barbers.length === 1) {
      setMemberId(barbers[0]._id);
    }
  }, [isPlainBarber, barbers, memberId]);

  // While the barber list narrows, every barber is tappable: services the
  // chosen barber does not offer are dropped once their catalog loads.
  useEffect(() => {
    if (isPlainBarber || !barberId || services === undefined) return;
    const offered = new Set(services.map((service) => service._id));
    if (serviceIds.every((id) => offered.has(id))) return;
    setServiceIds(serviceIds.filter((id) => offered.has(id)));
    setMinutes(undefined);
    setDroppedServices(true);
  }, [isPlainBarber, barberId, services, serviceIds]);

  const selectedServices =
    services?.filter((service) => serviceIds.includes(service._id)) ?? [];
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );
  const hasStartingLine = selectedServices.some(
    (service) => service.priceType === "starting",
  );

  const toggleService = (serviceId: Id<"services">) => {
    Haptics.selectionAsync();
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
    setMinutes(undefined);
    setDroppedServices(false);
  };
  const selectBarber = (nextId: Id<"barbershopMembers">) => {
    Haptics.selectionAsync();
    setMemberId(nextId);
    setBarberPicked(true);
    setMinutes(undefined);
    setDroppedServices(false);
  };
  const setField = (field: CustomerField) => (value: string) =>
    setCustomer((current) => ({ ...current, [field]: value }));

  const isDirty =
    serviceIds.length > 0 ||
    barberPicked ||
    dayMs !== undefined ||
    minutes !== undefined ||
    Object.values(customer).some((value) => value !== "");
  const disablePrevention = usePreventRemove(
    isDirty && !isSaved && !isDiscarding,
    ({ repeat }) => setDiscard(() => repeat),
  );

  const parsed = customerSchema.safeParse(customer);
  const fieldError = (field: CustomerField) =>
    submitted
      ? parsed.error?.issues.find((issue) => issue.path[0] === field)?.message
      : undefined;
  const selectionErrors = {
    services: serviceIds.length === 0 ? "Selecciona al menos un servicio" : "",
    barber: barberId ? "" : "Selecciona un barbero",
    slot:
      dayMs === undefined || minutes === undefined
        ? "Selecciona una fecha y hora"
        : "",
  };
  const showSelectionError = (key: keyof typeof selectionErrors) =>
    submitted ? selectionErrors[key] || undefined : undefined;

  const submit = async () => {
    setSubmitted(true);
    const hasSelectionError = Object.values(selectionErrors).some(Boolean);
    if (
      hasSelectionError ||
      !parsed.success ||
      !barberId ||
      dayMs === undefined ||
      minutes === undefined
    ) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        variant: "danger",
        label: "Revisa los datos del formulario e inténtalo de nuevo.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await create({
        appointment: {
          customerName: parsed.data.name,
          // Bogotá has no DST, so a slot is midnight plus its minutes.
          date: dayMs + minutes * 60_000,
          contactPhone: parsed.data.phone,
          contactEmail: parsed.data.email || undefined,
          notes: parsed.data.notes.trim() || undefined,
          barbershopId,
          barbershopMemberId: barberId,
          serviceIds,
          isStaffCreated: true,
        },
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.show({ variant: "success", label: "Cita reservada exitosamente" });
      // The guard reads the new state only after a render; lift it now.
      setIsSaved(true);
      disablePrevention();
      onSuccess();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({ variant: "danger", label: getConvexErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const slotsHint =
    serviceIds.length === 0
      ? "Selecciona un servicio para ver los horarios."
      : !barberId
        ? "Selecciona un barbero para ver los horarios."
        : dayMs === undefined
          ? "Selecciona una fecha para ver los horarios."
          : null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-4 pt-2 pb-10"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className="gap-2 rounded-[28px] bg-agenda-well p-2">
        <Section title="Servicios" error={showSelectionError("services")}>
          {services === undefined ? null : services.length === 0 ? (
            <Typography.Paragraph type="body-sm" color="muted">
              Esta barbería aún no tiene servicios.
            </Typography.Paragraph>
          ) : (
            <View>
              {services.map((service, index) => (
                <View key={service._id}>
                  {index > 0 ? <Separator /> : null}
                  <ServiceRow
                    name={service.name}
                    duration={service.duration}
                    price={servicePriceLabel(service)}
                    isSelected={serviceIds.includes(service._id)}
                    onPress={() => toggleService(service._id)}
                  />
                </View>
              ))}
            </View>
          )}
          {droppedServices ? (
            <Typography.Paragraph type="body-sm" color="muted">
              Se quitaron servicios que este barbero no ofrece.
            </Typography.Paragraph>
          ) : null}
          {selectedServices.length > 0 ? (
            <View className="flex-row items-baseline justify-between gap-3 border-border border-t pt-3">
              <Typography.Paragraph type="body-sm" color="muted">
                {selectedServices.length}{" "}
                {selectedServices.length === 1 ? "servicio" : "servicios"} ·{" "}
                {totalDuration} min
              </Typography.Paragraph>
              <Typography weight="semibold" style={tabularNums}>
                {hasStartingLine
                  ? `Desde ${formatCop(totalPrice)}`
                  : formatCop(totalPrice)}
              </Typography>
            </View>
          ) : null}
        </Section>

        {isPlainBarber ? null : (
          <Section title="Barbero" error={showSelectionError("barber")}>
            {barbers === undefined ? null : barbers.length === 0 ? (
              <Typography.Paragraph type="body-sm" color="muted">
                Ningún barbero ofrece todos los servicios elegidos.
              </Typography.Paragraph>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {barbers.map((barber) => {
                  const isSelected = barber._id === memberId;
                  return (
                    <Chip
                      key={barber._id}
                      variant={isSelected ? "primary" : "secondary"}
                      color={isSelected ? "accent" : "default"}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => selectBarber(barber._id)}
                    >
                      {barber.name}
                    </Chip>
                  );
                })}
              </View>
            )}
          </Section>
        )}

        <Section title="Fecha">
          <Calendar
            value={dayMs}
            isDayDisabled={isClosedDay}
            onChange={(next) => {
              setDayMs(next);
              setMinutes(undefined);
            }}
          />
        </Section>

        <Section title="Hora" error={showSelectionError("slot")}>
          {slotsHint ? (
            <Typography.Paragraph type="body-sm" color="muted">
              {slotsHint}
            </Typography.Paragraph>
          ) : (
            <SlotGrid slots={slots} value={minutes} onChange={setMinutes} />
          )}
        </Section>

        <Section title="Cliente">
          <TextField isRequired isInvalid={fieldError("name") !== undefined}>
            <Label>Nombre</Label>
            <Input
              value={customer.name}
              onChangeText={setField("name")}
              placeholder="Marcos Aguilar"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <FieldError>{fieldError("name")}</FieldError>
          </TextField>
          <TextField isRequired isInvalid={fieldError("phone") !== undefined}>
            <Label>Teléfono</Label>
            <Input
              value={customer.phone}
              onChangeText={setField("phone")}
              placeholder="311 987 1234"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
            <FieldError>{fieldError("phone")}</FieldError>
          </TextField>
          <TextField isInvalid={fieldError("email") !== undefined}>
            <Label>Correo (opcional)</Label>
            <Input
              value={customer.email}
              onChangeText={setField("email")}
              placeholder="cliente@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <FieldError>{fieldError("email")}</FieldError>
          </TextField>
        </Section>

        <Section title="Notas (opcional)">
          <TextField>
            <TextArea
              value={customer.notes}
              onChangeText={setField("notes")}
              maxLength={500}
              placeholder="Corte con cero, degradado medio-alto, etc."
            />
          </TextField>
        </Section>
      </View>

      <Button className="mt-4" isDisabled={isSaving} onPress={submit}>
        {isSaving ? "Reservando…" : "Reservar cita"}
      </Button>

      {/* Portaled: it can sit here without changing the scroll layout. */}
      <ConfirmDialog
        isOpen={discard !== null}
        onOpenChange={(open) => {
          if (!open) setDiscard(null);
        }}
        title="¿Descartar la cita?"
        description="Se perderán los datos que ingresaste."
        backLabel="Seguir editando"
        confirmLabel="Descartar"
        confirmVariant="danger"
        onConfirm={() => {
          const repeat = discard;
          setDiscard(null);
          // Same as the save path: the guard must be down before the replay.
          setIsDiscarding(true);
          disablePrevention();
          repeat?.();
        }}
      />
    </ScrollView>
  );
}

type SectionProps = {
  title: string;
  /** Shown under the content once the user tried to submit. */
  error?: string;
  children: ReactNode;
};

function Section({ title, error, children }: SectionProps) {
  return (
    <View className="gap-3 rounded-[20px] bg-agenda-card p-4">
      <Typography weight="medium" color="muted" style={sectionTitle}>
        {title}
      </Typography>
      {children}
      {error ? (
        <Typography.Paragraph type="body-sm" className="text-danger">
          {error}
        </Typography.Paragraph>
      ) : null}
    </View>
  );
}

type ServiceRowProps = {
  name: string;
  duration: number;
  price: string;
  isSelected: boolean;
  onPress: () => void;
};

function ServiceRow({
  name,
  duration,
  price,
  isSelected,
  onPress,
}: ServiceRowProps) {
  const accentForeground = useThemeColor("accent-foreground");

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      className="flex-row items-center gap-3 py-3"
    >
      <View className="flex-1 gap-0.5">
        <Typography weight="medium">{name}</Typography>
        <Typography.Paragraph type="body-sm" color="muted">
          {duration} min
        </Typography.Paragraph>
      </View>
      <Typography color="muted" style={tabularNums}>
        {price}
      </Typography>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border ${
          isSelected ? "border-accent bg-accent" : "border-border"
        }`}
      >
        {isSelected ? (
          <CheckIcon size={12} weight="bold" color={accentForeground} />
        ) : null}
      </View>
    </Pressable>
  );
}
