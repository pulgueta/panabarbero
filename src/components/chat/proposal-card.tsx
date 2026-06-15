import { CheckIcon, SpinnerIcon, XIcon } from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      // On success the action appends its confirmation message, so this card
      // stops being the last message and the buttons disappear on their own.
      // On failure the parent toasts and we re-enable the buttons for a retry.
      await onConfirm(proposal);
    } catch {
      setSubmitting(false);
    }
  }, [proposal, onConfirm]);

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
            disabled={submitting}
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
