import { createFileRoute, Link } from "@tanstack/react-router";
import FlagGame from "@/components/games/FlagGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/flag")({
  head: () => ({
    meta: [{ title: "اعرف العلم — Al-Daboor" }],
  }),
  component: FlagPage,
});

function FlagPage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="من الخدمات"
        title="اعرف العلم"
        subtitle="يطلع علم على الشاشة — وأول واحد يكتب اسم الدولة صح في الشات يفوز بالنقطة."
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
        <FlagGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
