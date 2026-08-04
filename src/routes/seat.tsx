import { createFileRoute, Link } from "@tanstack/react-router";
import HotSeatGame from "@/components/games/HotSeatGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/seat")({
  head: () => ({
    meta: [{ title: "الكراسي — Al-Daboor" }],
  }),
  component: SeatPage,
});

function SeatPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="اللعبة الثانية"
        title="الكراسي"
        subtitle="اكتبوا «دخول» في الشات، يلفّون حول الدائرة، تظهر أرقام على الكراسي، واللي ما يلحق يطلع لين يفوز واحد."
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
        <HotSeatGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
