import { createFileRoute } from "@tanstack/react-router";

import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  ssr: true,
});

function RouteComponent() {
  const { data: user } = useSession();

  return (
    <div>
      <h1>Hello "/"!</h1>
      {user ? <h1>Authenticated</h1> : <h1>Unauthenticated</h1>}
    </div>
  );
}
