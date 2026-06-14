import { CheckIcon, XIcon } from "@phosphor-icons/react";
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
  onConfirm: (proposal: Proposal) => void;
  onReject: () => void;
}

export function ProposalCard({
  proposal,
  onConfirm,
  onReject,
}: ProposalCardProps) {
  const [decided, setDecided] = useState(false);

  const handleConfirm = useCallback(() => {
    setDecided(true);
    onConfirm(proposal);
  }, [proposal, onConfirm]);

  const handleReject = useCallback(() => {
    setDecided(true);
    onReject();
  }, [onReject]);

  return (
    <Alert className="flex flex-col gap-3 border-primary/20 bg-primary/5 dark:bg-primary/10">
      <AlertDescription className="text-sm leading-relaxed">
        {proposal.summary}
      </AlertDescription>
      {!decided && (
        <div className="flex items-center justify-end gap-2">
          <Button
            className="h-8"
            onClick={handleReject}
            size="sm"
            variant="outline"
          >
            <XIcon className="size-3.5" />
            Cancelar
          </Button>
          <Button className="h-8" onClick={handleConfirm} size="sm">
            <CheckIcon className="size-3.5" />
            Confirmar
          </Button>
        </div>
      )}
    </Alert>
  );
}
