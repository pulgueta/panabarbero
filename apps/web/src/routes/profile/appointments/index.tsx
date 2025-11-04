import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";

export const Route = createFileRoute("/profile/appointments/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BorderContainer>Hello "/profile/appointments/"!</BorderContainer>;
}
