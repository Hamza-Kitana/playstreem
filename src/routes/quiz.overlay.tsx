import { createFileRoute } from "@tanstack/react-router";
import QuizOverlayStage from "@/components/games/QuizOverlayStage";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/quiz/overlay")({
  head: () => ({
    meta: [{ title: "نافذة الأسئلة — Al-Daboor" }],
  }),
  component: QuizOverlayPage,
});

function QuizOverlayPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <QuizOverlayStage messages={chat.messages} chatActive={chatActive} />;
}
