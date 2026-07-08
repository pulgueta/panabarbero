import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "@/components/chat/chat-view";
import { cacheTime } from "@/config/cache";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/pana/$threadId/",
)({
  component: PanaThreadRoute,
  ssr: "data-only",
  staticData: { breadcrumb: "Conversación" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
});

function PanaThreadRoute() {
  const { threadId } = Route.useParams();

  return <ChatView routeScope="dashboard" threadId={threadId} />;
}
