import { createFileRoute } from "@tanstack/react-router";
import HotSeatGame from "@/components/games/HotSeatGame";
import ConnectBanner from "@/components/ConnectBanner";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

const ACCENT = "#22d3ee";

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
        eyebrow="لعبة تفاعلية"
        title="الكراسي الموسيقية"
        subtitle="اكتبوا «دخول» في الشات، يلفّون حول الدائرة، تظهر أرقام على الكراسي، واللي ما يلحق يطلع لين يفوز واحد."
        accent={ACCENT}
      />
      {!chatActive ? <ConnectBanner accent={ACCENT} /> : null}
      <Reveal>
        <HotSeatGame messages={chat.messages} chatActive={chatActive} />
      </Reveal>
    </section>
  );
}
