import { createFileRoute } from "@tanstack/react-router";
import FootballGame from "@/components/games/FootballGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/football")({
  head: () => ({
    meta: [{ title: "أسئلة كروية — Al-Daboor" }],
  }),
  component: FootballPage,
});

function FootballPage() {
  const chat = useKickChatContext();
  return <FootballGame messages={chat.messages} chatActive={chat.status === "live"} />;
}
