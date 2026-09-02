import { createFileRoute } from "@tanstack/react-router";
import ZombieShooterGame from "@/components/games/ZombieShooterGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/zombie")({
  head: () => ({
    meta: [{ title: "شوتر الزومبي — Al-Daboor" }],
  }),
  component: ZombiePage,
});

function ZombiePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <ZombieShooterGame messages={chat.messages} chatActive={chatActive} />;
}
