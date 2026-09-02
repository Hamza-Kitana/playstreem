import { createFileRoute } from "@tanstack/react-router";
import { Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";
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
        subtitle="حط رابط بثك أو اسم القناة، اربط، وبعدين روح لأي لعبة من الشريط فوق."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <ConnectPanel
            status={chat.status}
            channel={chat.channel}
            onConnect={chat.connect}
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
        <p className="mt-3 text-center text-sm font-semibold text-destructive">{chat.error}</p>
      ) : null}

      {/* Perks strip */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <PerkCard
          icon={<Zap className="size-5" />}
          title="ربط سريع"
          desc="ثانية وأنت فوق. اسم القناة أو الرابط، والباقي علينا."
          accent="var(--neon)"
        />
        <PerkCard
          icon={<ShieldCheck className="size-5" />}
          title="آمن ومستقر"
          desc="جلستك محفوظة — لو حدثت الصفحة يرجع الربط لحالو."
          accent="var(--neon-2)"
        />
        <PerkCard
          icon={<Radio className="size-5" />}
          title="بث مباشر"
          desc="الشات يصلك لحظياً — كل رسالة تتحرك مع الألعاب."
          accent="var(--neon-3)"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/60">
        <Sparkles className="size-3.5 text-primary" />
        <span>
          للبث المستمر من OBS استخدم{" "}
          <span className="font-brand mx-1 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-bold text-primary" dir="ltr">
            /connect?channel=اسمك
          </span>
        </span>
      </div>
    </section>
  );
}

function PerkCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        className="pointer-events-none absolute -top-16 -left-16 size-40 rounded-full opacity-50 blur-3xl"
        style={{ background: accent }}
      />
      <div className="relative">
        <span
          className="grid size-11 place-items-center rounded-2xl"
          style={{
            color: accent,
            background: `color-mix(in oklab, ${accent} 18%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 40%, transparent)`,
          }}
        >
          {icon}
        </span>
        <h3 className="mt-3 text-base font-extrabold" style={{ color: `color-mix(in oklab, ${accent} 60%, white 40%)` }}>
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-white/60">{desc}</p>
      </div>
    </div>
  );
}
