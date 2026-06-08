import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "@/components/chat/chat-view";
import { cacheTime } from "@/config/cache";
import { seo } from "@/lib/utils";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThreadRoute,
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  head: () => ({
    meta: [
      ...seo({
        title: "Pana, tu asistente IA - PanaBarbero",
        description:
          "Tu conversación con Pana en PanaBarbero: busca barberías, revisa disponibilidad y gestiona tus citas.",
      }),
      // Conversations are private to each user — keep them out of search.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function ChatThreadRoute() {
  const { threadId } = Route.useParams();

  return <ChatView threadId={threadId} />;
}
