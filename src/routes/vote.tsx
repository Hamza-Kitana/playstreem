import { createFileRoute } from "@tanstack/react-router";
import PollGame from "@/components/games/PollGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#38bdf8";

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
        title="التصويت المباشر"
        subtitle="نتائج حية تتحرك مع كل تعليق من الشات."
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <PollGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
