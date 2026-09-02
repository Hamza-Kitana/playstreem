import { createFileRoute } from "@tanstack/react-router";
import RiddleGame from "@/components/games/RiddleGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#fb923c";

export const Route = createFileRoute("/riddle")({
  head: () => ({
    meta: [{ title: "الألغاز — Al-Daboor" }],
  }),
  component: RiddlePage,
});

function RiddlePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="لعبة تفاعلية"
        title="ألغاز صعبة"
        subtitle="ألغاز تحتاج تفكير — الحل مخفي، والجمهور يخمن في الشات. أول إصابة تفوز بالنقطة."
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <RiddleGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
