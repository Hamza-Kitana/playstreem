import { createFileRoute } from "@tanstack/react-router";
import HotSeatGame from "@/components/games/HotSeatGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/seat")({
  head: () => ({
    meta: [{ title: "الكراسي — Al-Daboor" }],
  }),
  component: SeatPage,
});

function SeatPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <HotSeatGame messages={chat.messages} chatActive={chatActive} />;
}
