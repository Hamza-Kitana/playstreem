import { createFileRoute } from "@tanstack/react-router";
import MovieGame from "@/components/games/MovieGame";
import { useKickChatContext } from "@/contexts/KickChatContext";

export const Route = createFileRoute("/movie")({
  head: () => ({
    meta: [{ title: "مثّل الفيلم — Al-Daboor" }],
  }),
  component: MoviePage,
});

function MoviePage() {
  const chat = useKickChatContext();
  return <MovieGame messages={chat.messages} chatActive={chat.status === "live"} />;
}
