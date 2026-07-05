import { CalendarBlankIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface CalendarEmptyProps {
  message: string;
  canCreate: boolean;
  onCreate: () => void;
}

/** Shared empty state for agenda/day surfaces (icon + teach + primary action). */
export const CalendarEmpty: FC<CalendarEmptyProps> = ({
  message,
  canCreate,
  onCreate,
}) => (
  <Empty className="border-0">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <CalendarBlankIcon />
      </EmptyMedia>
      <EmptyTitle>{message}</EmptyTitle>
      <EmptyDescription>
        Cuando agendes una cita, aparecerá aquí.
      </EmptyDescription>
    </EmptyHeader>
    {canCreate ? (
      <EmptyContent>
        <Button onClick={onCreate}>Crear cita</Button>
      </EmptyContent>
    ) : null}
  </Empty>
);
