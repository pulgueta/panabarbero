import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/appointments/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/appointments/"!</div>;
}
