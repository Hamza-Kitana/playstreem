import { createFileRoute } from "@tanstack/react-router";
import QuizGame from "@/components/games/QuizGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#8b5cf6";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [{ title: "أسئلة وأجوبة — Al-Daboor" }],
  }),
  component: QuizPage,
});

function QuizPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="لعبة تفاعلية"
        title="أسئلة وأجوبة"
        subtitle="اختر من ١٠ إلى ١٥٠ سؤال من المكتبة، خلّص الجولة، وبعد آخر سؤال تطلع النتيجة النهائية بدون تكرار."
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <QuizGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
