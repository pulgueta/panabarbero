import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/appointments/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/appointments/create"!</div>;
}
