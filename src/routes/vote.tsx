import { createFileRoute, Link } from "@tanstack/react-router";
import PollGame from "@/components/games/PollGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vote")({
  head: () => ({
    meta: [{ title: "التصويت — Al-Daboor" }],
  }),
  component: VotePage,
});

function VotePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="لعبة تفاعلية"
        title="التصويت"
        subtitle="نتائج حية تتحرك مع كل تعليق من الشات."
      />
      {!chatActive ? (
        <div className="glass mb-6 rounded-2xl p-4 text-center text-sm text-muted-foreground">
          الشات غير متصل.{" "}
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <Link to="/connect">اربط قناتك</Link>
          </Button>
        </div>
      ) : null}
      <Reveal>
        <PollGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
