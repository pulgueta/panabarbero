import type { FC, ReactElement } from "react";
import { Suspense } from "react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { PricingCards } from "./pricing-cards";

interface PricingDialogProps {
  trigger: ReactElement;
}

export const PricingDialog: FC<PricingDialogProps> = ({ trigger }) => {
  return (
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent className="min-w-auto overflow-y-auto md:min-w-3xl lg:min-w-4xl xl:min-w-5xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Elige tu plan</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Selecciona el plan que mejor se adapte a tu barbería.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <Suspense
          fallback={
            <div className="grid gap-4 py-4 md:grid-cols-3">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          }
        >
          <PricingCards />
        </Suspense>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
