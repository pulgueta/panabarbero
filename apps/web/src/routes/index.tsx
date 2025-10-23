import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  ssr: true,
});

function RouteComponent() {
  return (
    <div>
      <h1>Hello "/"!</h1>
      <Authenticated>
        <h1>Authenticated</h1>
      </Authenticated>
      <Unauthenticated>
        <h1>Unauthenticated</h1>
      </Unauthenticated>
    </div>
  );
}
