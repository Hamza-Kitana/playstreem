import { createFileRoute } from "@tanstack/react-router";
import QuizGame from "@/components/games/QuizGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [{ title: "أسئلة وأجوبة — Al-Daboor" }],
  }),
  component: QuizPage,
});

function QuizPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return <QuizGame messages={chat.messages} chatActive={chatActive} />;
}
