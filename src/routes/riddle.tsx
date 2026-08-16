import { createFileRoute, Link } from "@tanstack/react-router";
import RiddleGame from "@/components/games/RiddleGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

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
        title="الألغاز"
        subtitle="ألغاز تحتاج تفكير — الحل مخفي، والجمهور يخمن في الشات. أول إصابة تفوز بالنقطة."
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
        <RiddleGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
