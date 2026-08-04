import { createFileRoute } from "@tanstack/react-router";
import ChatFeed from "@/components/ChatFeed";
import ConnectPanel from "@/components/ConnectPanel";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";

type ConnectSearch = {
  channel?: string;
  kick?: string;
};

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>): ConnectSearch => ({
    channel: typeof search.channel === "string" ? search.channel : undefined,
    kick: typeof search.kick === "string" ? search.kick : undefined,
  }),
  head: () => ({
    meta: [{ title: "الربط — Al-Daboor" }],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const chat = useKickChatContext();

  return (
    <section>
      <SectionHeading
        eyebrow="الخطوة الأولى"
        title="اربط كيك"
        subtitle="كبسة واحدةحدة — بدون ما تكتب اسم القناة. انسخ رابط بثك من كيك أو استخدم رابط جاهز."
      />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <ConnectPanel
            status={chat.status}
            channel={chat.channel}
            onConnect={chat.connect}
            onDemo={chat.startDemo}
            onStop={chat.stop}
          />
        </Reveal>
        <Reveal delay={120}>
          <ChatFeed
            messages={chat.messages}
            status={chat.status}
            channel={chat.channel}
            className="h-full"
          />
        </Reveal>
      </div>
      {chat.error ? (
        <p className="mt-3 text-center text-sm text-destructive">{chat.error}</p>
      ) : null}
    </section>
  );
}
