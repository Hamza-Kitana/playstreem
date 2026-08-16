import { createFileRoute, Link } from "@tanstack/react-router";
import PhraseGame from "@/components/games/PhraseGame";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/phrase")({
  head: () => ({
    meta: [{ title: "الجملة — Al-Daboor" }],
  }),
  component: PhrasePage,
});

function PhrasePage() {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live";

  return (
    <section>
      <SectionHeading
        eyebrow="لعبة تفاعلية"
        title="الجملة"
        subtitle="الستريمر يكتب كلمة سرية ما بتطلع على الشاشة — الجمهور يخمنها في الشات واللي يصيب يطلع اسمه."
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
        <PhraseGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
