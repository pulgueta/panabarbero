import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "@/components/chat/chat-view";
import { cacheTime } from "@/config/cache";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/pana/",
)({
  component: PanaChatRoute,
  ssr: "data-only",
  staticData: { breadcrumb: "Chat" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
});

function PanaChatRoute() {
  return <ChatView routeScope="dashboard" />;
}
