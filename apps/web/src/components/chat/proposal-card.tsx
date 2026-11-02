import { CheckIcon, SpinnerIcon, XIcon } from "@phosphor-icons/react";
import { useCallback, useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";

const PROPOSAL_KIND = "needs-confirmation" as const;

import { z } from "zod";

/**
 * A tool output that asks the user to confirm an action. The card only needs
 * `summary` (what it shows) and forwards `action` + `args` opaquely to
 * `confirmPendingAction`, which is the authoritative validator and authz gate.
 * Keeping this loose (instead of mirroring every action's args) means any new
 * server-side action renders a confirmation card without a matching client
 * edit — the action set lives only in `convex/`.
 */
export const proposalSchema = z.object({
  kind: z.literal(PROPOSAL_KIND),
  action: z.string(),
  summary: z.string(),
  args: z.unknown(),
});

export type Proposal = z.infer<typeof proposalSchema>;

/**
 * The one exception to the loose-args rule: completing a cita with "desde"
 * lines needs their agreed final prices, which only the user can supply. The
 * proposal ships the pending lines; the card collects one final price each and
 * sends them back as `finalPrices` (re-validated server-side by `setStatus`).
 */
const completionFinalsSchema = z.object({
  status: z.literal("completed"),
  startingLines: z
    .object({
      serviceId: z.string(),
      name: z.string(),
      minimumPrice: z.number(),
    })
    .array()
    .min(1),
});

interface ProposalCardProps {
  proposal: Proposal;
  /**
   * Whether this proposal is still awaiting a decision. A proposal is "decided"
   * the moment any message follows it — confirming appends the confirmation
   * message, rejecting appends the rejection, and either way the buttons go
   * away. The decision lives in the conversation itself, so it survives reloads
   * without any extra state.
   */
  isActive: boolean;
  onConfirm: (proposal: Proposal) => Promise<void>;
  onReject: () => Promise<void>;
}

export function ProposalCard({
  proposal,
  isActive,
  onConfirm,
  onReject,
}: ProposalCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const inputIdPrefix = useId();

  const completionFinals =
    proposal.action === "manageAppointment"
      ? completionFinalsSchema.safeParse(proposal.args)
      : undefined;
  const startingLines = completionFinals?.success
    ? completionFinals.data.startingLines
    : undefined;

  const [finalPrices, setFinalPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (startingLines ?? []).map((line) => [
        line.serviceId,
        String(line.minimumPrice),
      ]),
    ),
  );

  const isLineValid = (line: { serviceId: string; minimumPrice: number }) => {
    const value = Number(finalPrices[line.serviceId]);

    return Number.isFinite(value) && value >= line.minimumPrice;
  };

  const finalsInvalid = Boolean(
    startingLines && !startingLines.every(isLineValid),
  );

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      // On success the action appends its confirmation message, so this card
      // stops being the last message and the buttons disappear on their own.
      // On failure the parent toasts and we re-enable the buttons for a retry.
      await onConfirm(
        startingLines
          ? {
              ...proposal,
              args: {
                ...(proposal.args as Record<string, unknown>),
                finalPrices: startingLines.map((line) => ({
                  serviceId: line.serviceId,
                  finalPrice: Number(finalPrices[line.serviceId]),
                })),
              },
            }
          : proposal,
      );
    } catch {
      setSubmitting(false);
    }
  }, [proposal, onConfirm, startingLines, finalPrices]);

  const handleReject = useCallback(async () => {
    setSubmitting(true);
    try {
      await onReject();
    } catch {
      setSubmitting(false);
    }
  }, [onReject]);

  return (
    <Alert className="flex flex-col gap-3 border-primary/20 bg-primary/5 dark:bg-primary/10">
      <AlertDescription className="text-sm leading-relaxed">
        {proposal.summary}
      </AlertDescription>
      {isActive && startingLines && (
        <div className="flex flex-col gap-3">
          {startingLines.map((line) => {
            const invalid = !isLineValid(line);
            const inputId = `${inputIdPrefix}-${line.serviceId}`;

            return (
              <Field key={line.serviceId} data-invalid={invalid}>
                <Label htmlFor={inputId}>{line.name}</Label>
                <Input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={line.minimumPrice}
                  value={finalPrices[line.serviceId] ?? ""}
                  onChange={(e) =>
                    setFinalPrices((prev) => ({
                      ...prev,
                      [line.serviceId]: e.target.value,
                    }))
                  }
                  aria-invalid={invalid}
                  disabled={submitting}
                  className="tabular-nums"
                />
                <p
                  className={cn(
                    "text-xs",
                    invalid ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  Mínimo {formatCurrency(line.minimumPrice)}.
                </p>
              </Field>
            );
          })}
        </div>
      )}
      {isActive && (
        <div className="flex items-center justify-end gap-2">
          <Button
            className="h-8"
            disabled={submitting}
            onClick={handleReject}
            size="sm"
            variant="outline"
          >
            <XIcon className="size-3.5" />
            Cancelar
          </Button>
          <Button
            className="h-8"
            disabled={submitting || finalsInvalid}
            onClick={handleConfirm}
            size="sm"
          >
            {submitting ? (
              <SpinnerIcon className="size-3.5 animate-spin" />
            ) : (
              <CheckIcon className="size-3.5" />
            )}
            Confirmar
          </Button>
        </div>
      )}
    </Alert>
  );
}
