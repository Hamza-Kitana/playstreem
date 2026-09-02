import { createFileRoute } from "@tanstack/react-router";
import DrawGame from "@/components/games/DrawGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/draw")({
  head: () => ({
    meta: [{ title: "ارسم وخمّن — Al-Daboor" }],
  }),
  component: DrawPage,
});

function DrawPage() {
  const chat = useKickChatContext();
  return <DrawGame messages={chat.messages} chatActive={chat.status === "live"} />;
}
