import { createFileRoute } from "@tanstack/react-router";
import FlagGame from "@/components/games/FlagGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#f472b6";

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
        eyebrow="لعبة تفاعلية"
        title="اعرف العلم"
        subtitle="يطلع علم على الشاشة — وأول واحد يكتب اسم الدولة صح في الشات يفوز بالنقطة."
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <FlagGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
