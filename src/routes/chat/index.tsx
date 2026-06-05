import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "@/components/chat/chat-view";
import { getCanonicalUrl, seo } from "@/lib/utils";

export const Route = createFileRoute("/chat/")({
  component: ChatIndexRoute,
  ssr: "data-only",
  head: () => ({
    meta: seo({
      title: "Pana, tu asistente IA - PanaBarbero",
      description:
        "Habla con Pana para buscar barberías, ver disponibilidad y gestionar tus citas en PanaBarbero.",
      canonical: getCanonicalUrl("/chat"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/chat") }],
  }),
});

function ChatIndexRoute() {
  return <ChatView />;
}
