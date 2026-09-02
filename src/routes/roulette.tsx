import { createFileRoute } from "@tanstack/react-router";
import RouletteGame from "@/components/games/RouletteGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/roulette")({
  head: () => ({
    meta: [{ title: "روليت الحظ — Al-Daboor" }],
  }),
  component: RoulettePage,
});

function RoulettePage() {
  const chat = useKickChatContext();
  return <RouletteGame messages={chat.messages} chatActive={chat.status === "live"} />;
}
