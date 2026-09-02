import { createFileRoute } from "@tanstack/react-router";
import PhraseGame from "@/components/games/PhraseGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/phrase")({
  head: () => ({
    meta: [{ title: "الجملة — Al-Daboor" }],
  }),
  component: PhrasePage,
});

function PhrasePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <PhraseGame messages={chat.messages} chatActive={chatActive} />;
}
