import { createFileRoute } from "@tanstack/react-router";
import ZombieShooterGame from "@/components/games/ZombieShooterGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#f43f5e";

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
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <ZombieShooterGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
