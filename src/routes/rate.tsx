import { createFileRoute } from "@tanstack/react-router";
import RateGame from "@/components/games/RateGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#facc15";

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
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <RateGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
