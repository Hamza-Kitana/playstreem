import { createFileRoute } from "@tanstack/react-router";
import PhraseGame from "@/components/games/PhraseGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#a78bfa";

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
        title="الجملة السرّية"
        subtitle="الستريمر يكتب كلمة سرية ما بتطلع على الشاشة — الجمهور يخمنها في الشات واللي يصيب يطلع اسمه."
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <PhraseGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
