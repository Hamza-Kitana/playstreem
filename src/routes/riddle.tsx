import { createFileRoute } from "@tanstack/react-router";
import RiddleGame from "@/components/games/RiddleGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/riddle")({
  head: () => ({
    meta: [{ title: "الألغاز — Al-Daboor" }],
  }),
  component: RiddlePage,
});

function RiddlePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <RiddleGame messages={chat.messages} chatActive={chatActive} />;
}
