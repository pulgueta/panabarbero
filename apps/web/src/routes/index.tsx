import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  ssr: true,
});

function RouteComponent() {
  const { data: user } = useSession();

  console.log(user);

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
