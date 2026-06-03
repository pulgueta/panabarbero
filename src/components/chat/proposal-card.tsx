import { CheckIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const PROPOSAL_KIND = "needs-confirmation" as const;

import { z } from "zod";

export const proposalSchema = z.discriminatedUnion("action", [
  z.object({
    kind: z.literal(PROPOSAL_KIND),
    action: z.literal("book"),
    summary: z.string(),
    args: z.object({
      barbershopId: z.string(),
      serviceId: z.string(),
      barbershopMemberId: z.string(),
      date: z.number(),
      customerName: z.string(),
      contactPhone: z.string(),
      contactEmail: z.string().optional(),
      notes: z.string().optional(),
    }),
  }),
  z.object({
    kind: z.literal(PROPOSAL_KIND),
    action: z.literal("cancel"),
    summary: z.string(),
    args: z.object({
      appointmentId: z.string(),
      reason: z.string(),
    }),
  }),
  z.object({
    kind: z.literal(PROPOSAL_KIND),
    action: z.literal("reschedule"),
    summary: z.string(),
    args: z.object({
      appointmentId: z.string(),
      proposedDate: z.number(),
    }),
  }),
]);

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
