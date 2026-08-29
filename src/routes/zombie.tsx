import { createFileRoute, Link } from "@tanstack/react-router";
import ZombieShooterGame from "@/components/games/ZombieShooterGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/zombie")({
  head: () => ({
    meta: [{ title: "شوتر الزومبي — Al-Daboor" }],
  }),
  component: ZombiePage,
});

function ZombiePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="لعبة تفاعلية"
        title="شوتر الزومبي"
        subtitle="ماب مغلقة — الجمهور ينزّل زومبي ووحوش من الشات، والستريمر يطلق النار عشان يصمد للنهاية."
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
        <ZombieShooterGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
