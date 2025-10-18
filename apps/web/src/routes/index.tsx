import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  ssr: true,
});

function RouteComponent() {
  return <div>Hello "/"!</div>;
}
