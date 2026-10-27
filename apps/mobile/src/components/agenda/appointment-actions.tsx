import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import {
  BottomSheet,
  Button,
  type ButtonVariant,
  Description,
  Dialog,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
  useToast,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, View } from "react-native";

import { useAppointmentActions } from "@/hooks/use-appointments";
import {
  type Appointment,
  formatCop,
  isStartingItem,
} from "@/lib/appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { formatDayTime } from "@/lib/dates";

const tabularNums = { fontVariant: ["tabular-nums" as const] };

const ACTIONABLE_STATUSES: Appointment["status"][] = [
  "pending",
  "confirmed",
  "rescheduled",
];

const MIN_REASON_LENGTH = 3;

type Action = "complete" | "noShow" | "cancel" | "accept" | "deny";
type FinalPrice = { serviceId: Id<"services">; finalPrice: number };

/** Runs one action at a time, with haptic + toast feedback. */
function useRunAction() {
  const { toast } = useToast();
  const [pending, setPending] = useState<Action | null>(null);

  const run = async (
    action: Action,
    task: () => Promise<unknown>,
    successLabel: string,
  ) => {
    setPending(action);
    try {
      await task();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.show({ variant: "success", label: successLabel });
      return true;
    } catch (error) {
      toast.show({ variant: "danger", label: getConvexErrorMessage(error) });
      return false;
    } finally {
      setPending(null);
    }
  };

  return { pending, run };
}

/** Reschedule card and status actions for the staff-side appointment detail. */
export function AppointmentActions({
  appointment,
}: {
  appointment: Appointment;
}) {
  const actions = useAppointmentActions();
  const { pending, run } = useRunAction();
  const [open, setOpen] = useState<
    "prices" | "complete" | "noShow" | "cancel"
  >();
  const close = () => setOpen(undefined);
  const setOpenFor = (key: NonNullable<typeof open>) => (next: boolean) =>
    setOpen(next ? key : undefined);

  const id = appointment._id;
  const items = appointment.items ?? [];
  const needsFinalPrices = items.some(isStartingItem);
  const hasRescheduleRequest =
    appointment.status === "pending" && appointment.proposedDate !== undefined;
  const isActionable = ACTIONABLE_STATUSES.includes(appointment.status);

  if (!isActionable) return null;

  const complete = async (finalPrices?: FinalPrice[]) => {
    const done = await run(
      "complete",
      () => actions.complete(id, finalPrices),
      "Cita completada",
    );
    if (done) close();
  };

  return (
    <View className="gap-6">
      {hasRescheduleRequest && appointment.proposedDate !== undefined ? (
        <RescheduleRequestCard
          currentDate={appointment.date}
          proposedDate={appointment.proposedDate}
          pending={pending}
          onAnswer={(accepted) =>
            run(
              accepted ? "accept" : "deny",
              () => actions.answerReschedule(id, accepted),
              accepted ? "Cita reagendada" : "Solicitud rechazada",
            )
          }
        />
      ) : null}

      <View className="gap-3">
        <Button
          isDisabled={pending !== null}
          onPress={() => setOpen(needsFinalPrices ? "prices" : "complete")}
        >
          Marcar completada
        </Button>
        <Button
          variant="secondary"
          isDisabled={pending !== null}
          onPress={() => setOpen("noShow")}
        >
          No asistió
        </Button>
        <Button
          variant="danger-soft"
          isDisabled={pending !== null}
          onPress={() => setOpen("cancel")}
        >
          Cancelar cita
        </Button>
      </View>

      <FinalPriceSheet
        appointment={appointment}
        isOpen={open === "prices"}
        onOpenChange={setOpenFor("prices")}
        isPending={pending === "complete"}
        onConfirm={complete}
      />
      <ConfirmDialog
        isOpen={open === "complete"}
        onOpenChange={setOpenFor("complete")}
        title="¿Marcar esta cita como completada?"
        confirmLabel="Completar"
        isPending={pending === "complete"}
        onConfirm={() => complete()}
      />
      <ConfirmDialog
        isOpen={open === "noShow"}
        onOpenChange={setOpenFor("noShow")}
        title="¿Marcar que el cliente no asistió?"
        confirmLabel="Confirmar"
        isPending={pending === "noShow"}
        onConfirm={async () => {
          const done = await run(
            "noShow",
            () => actions.markNoShow(id),
            "Marcada como no asistió",
          );
          if (done) close();
        }}
      />
      <CancelDialog
        isOpen={open === "cancel"}
        onOpenChange={setOpenFor("cancel")}
        isPending={pending === "cancel"}
        onConfirm={async (reason) => {
          const done = await run(
            "cancel",
            () => actions.cancel(id, reason),
            "Cita cancelada",
          );
          if (done) close();
        }}
      />
    </View>
  );
}

type RescheduleRequestCardProps = {
  currentDate: number;
  proposedDate: number;
  pending: Action | null;
  onAnswer: (accepted: boolean) => void;
};

export function RescheduleRequestCard({
  currentDate,
  proposedDate,
  pending,
  onAnswer,
}: RescheduleRequestCardProps) {
  return (
    <View className="gap-4 rounded-2xl border border-border p-4">
      <View className="gap-1">
        <Typography weight="medium">Solicitud de reagendamiento</Typography>
        <Typography.Paragraph type="body-sm" color="muted">
          El cliente pidió mover la cita.
        </Typography.Paragraph>
      </View>
      <View className="gap-1">
        <MomentLine label="Actual" value={formatDayTime(currentDate)} />
        <MomentLine
          label="Propuesta"
          value={formatDayTime(proposedDate)}
          emphasized
        />
      </View>
      <View className="flex-row gap-3">
        <Button
          className="flex-1"
          isDisabled={pending !== null}
          onPress={() => onAnswer(true)}
        >
          Aceptar
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          isDisabled={pending !== null}
          onPress={() => onAnswer(false)}
        >
          Rechazar
        </Button>
      </View>
    </View>
  );
}

function MomentLine({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Typography.Paragraph color="muted">{label}</Typography.Paragraph>
      <Typography
        weight={emphasized ? "semibold" : "normal"}
        style={tabularNums}
      >
        {value}
      </Typography>
    </View>
  );
}

type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  isPending: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  confirmLabel,
  confirmVariant = "primary",
  isPending,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title className="mb-5">{title}</Dialog.Title>
          <DialogButtons
            confirmLabel={confirmLabel}
            confirmVariant={confirmVariant}
            isDisabled={isPending}
            onBack={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

type CancelDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (reason: string) => void;
};

export function CancelDialog({
  isOpen,
  onOpenChange,
  isPending,
  onConfirm,
}: CancelDialogProps) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const isValid = trimmed.length >= MIN_REASON_LENGTH;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (next) setReason("");
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <KeyboardAvoidingView behavior="padding">
          <Dialog.Content>
            <View className="mb-4 gap-1.5">
              <Dialog.Title>¿Cancelar esta cita?</Dialog.Title>
              <Dialog.Description>
                Esta acción no se puede deshacer.
              </Dialog.Description>
            </View>
            <TextField
              isRequired
              isInvalid={trimmed.length > 0 && !isValid}
              className="mb-5"
            >
              <Label>Motivo</Label>
              <TextArea
                value={reason}
                onChangeText={setReason}
                placeholder="Ej.: el barbero no está disponible"
              />
              <Description>El cliente recibirá este motivo.</Description>
              <FieldError>Escribe al menos 3 caracteres.</FieldError>
            </TextField>
            <DialogButtons
              confirmLabel="Cancelar cita"
              confirmVariant="danger"
              isDisabled={isPending || !isValid}
              onBack={() => onOpenChange(false)}
              onConfirm={() => onConfirm(trimmed)}
            />
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  );
}

function DialogButtons({
  confirmLabel,
  confirmVariant,
  isDisabled,
  onBack,
  onConfirm,
}: {
  confirmLabel: string;
  confirmVariant: ButtonVariant;
  isDisabled: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <View className="flex-row justify-end gap-3">
      <Button variant="ghost" size="sm" onPress={onBack}>
        Volver
      </Button>
      <Button
        variant={confirmVariant}
        size="sm"
        isDisabled={isDisabled}
        onPress={onConfirm}
      >
        {confirmLabel}
      </Button>
    </View>
  );
}

type FinalPriceSheetProps = {
  appointment: Appointment;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (finalPrices: FinalPrice[]) => void;
};

/** Collects the agreed price of each "desde" line before completing. */
export function FinalPriceSheet({
  appointment,
  isOpen,
  onOpenChange,
  isPending,
  onConfirm,
}: FinalPriceSheetProps) {
  const items = appointment.items ?? [];
  const startingLines = items.filter(isStartingItem);
  const fixedLines = items.filter((item) => !isStartingItem(item));
  const [prices, setPrices] = useState<Record<string, string>>({});

  const priceOf = (line: (typeof items)[number]) =>
    Number(prices[line.serviceId] ?? line.price);
  const isLineValid = (line: (typeof items)[number]) => {
    const value = priceOf(line);
    return Number.isFinite(value) && value >= line.price;
  };
  const allValid = startingLines.every(isLineValid);

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (next) setPrices({});
        onOpenChange(next);
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content keyboardBehavior="extend">
          <View className="mb-5 gap-1.5">
            <BottomSheet.Title>Precio final</BottomSheet.Title>
            <BottomSheet.Description>
              Registra el precio acordado de los servicios con precio desde.
            </BottomSheet.Description>
          </View>

          {fixedLines.length > 0 ? (
            <View className="mb-5 gap-1">
              {fixedLines.map((line) => (
                <View
                  key={line.serviceId}
                  className="flex-row items-baseline justify-between gap-3"
                >
                  <Typography.Paragraph color="muted" className="flex-1">
                    {line.name}
                  </Typography.Paragraph>
                  <Typography.Paragraph color="muted" style={tabularNums}>
                    {formatCop(line.finalPrice ?? line.price)}
                  </Typography.Paragraph>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mb-6 gap-4">
            {startingLines.map((line) => (
              <PriceField
                key={line.serviceId}
                label={line.name}
                minimum={line.price}
                value={prices[line.serviceId] ?? String(line.price)}
                isInvalid={!isLineValid(line)}
                onChange={(value) =>
                  setPrices((current) => ({
                    ...current,
                    [line.serviceId]: value,
                  }))
                }
              />
            ))}
          </View>

          <Button
            isDisabled={isPending || !allValid}
            onPress={() =>
              onConfirm(
                startingLines.map((line) => ({
                  serviceId: line.serviceId,
                  finalPrice: priceOf(line),
                })),
              )
            }
          >
            Completar
          </Button>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function PriceField({
  label,
  minimum,
  value,
  isInvalid,
  onChange,
}: {
  label: string;
  minimum: number;
  value: string;
  isInvalid: boolean;
  onChange: (value: string) => void;
}) {
  // Keeps the focused input above the keyboard inside the sheet.
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <TextField isRequired isInvalid={isInvalid}>
      <Label>{label}</Label>
      <Input
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
        keyboardType="number-pad"
        onFocus={onFocus}
        onBlur={onBlur}
        style={tabularNums}
      />
      <Description>Mínimo {formatCop(minimum)}</Description>
      <FieldError>Ingresa {formatCop(minimum)} o más.</FieldError>
    </TextField>
  );
}
