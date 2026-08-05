import { createFileRoute, Link } from "@tanstack/react-router";
import QuizGame from "@/components/games/QuizGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

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
        eyebrow="اللعبة الأولى"
        title="أسئلة وأجوبة"
        subtitle="اختر من ١٠ إلى ١٥٠ سؤال من المكتبة، خلّص الجولة، وبعد آخر سؤال تطلع النتيجة النهائية بدون تكرار."
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
        <QuizGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
