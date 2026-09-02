import { createFileRoute } from "@tanstack/react-router";
import FlagGame from "@/components/games/FlagGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/flag")({
  head: () => ({
    meta: [{ title: "اعرف العلم — Al-Daboor" }],
  }),
  component: FlagPage,
});

function FlagPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <FlagGame messages={chat.messages} chatActive={chatActive} />;
}
