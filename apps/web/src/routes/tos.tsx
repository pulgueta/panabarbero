import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/tos")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <h1 className="text-balance font-extrabold text-3xl tracking-tight">
        Términos de servicio
      </h1>
    </BorderContainer>
  );
}
