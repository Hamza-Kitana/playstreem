import { createFileRoute } from "@tanstack/react-router";
import PollGame from "@/components/games/PollGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/vote")({
  head: () => ({
    meta: [{ title: "التصويت — Al-Daboor" }],
  }),
  component: VotePage,
});

function VotePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <PollGame messages={chat.messages} chatActive={chatActive} />;
}
