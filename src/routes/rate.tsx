import { createFileRoute, Link } from "@tanstack/react-router";
import RateGame from "@/components/games/RateGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rate")({
  head: () => ({
    meta: [{ title: "بطولة تقييم الأشخاص — Al-Daboor" }],
  }),
  component: RatePage,
});

function RatePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="لعبة تفاعلية"
        title="بطولة تقييم الأشخاص"
        subtitle="أضف المعايير والأسماء، ثم قيّم كل شخص معيارًا معيارًا قبل عرض الترتيب النهائي."
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
        <RateGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
