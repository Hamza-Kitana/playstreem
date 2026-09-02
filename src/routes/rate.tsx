import { createFileRoute } from "@tanstack/react-router";
import RateGame from "@/components/games/RateGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/rate")({
  head: () => ({
    meta: [{ title: "بطولة تقييم الأشخاص — Al-Daboor" }],
  }),
  component: RatePage,
});

function RatePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <RateGame messages={chat.messages} chatActive={chatActive} />;
}
