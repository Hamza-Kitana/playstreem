import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Radio, ShieldCheck, Sparkles, Youtube, Zap } from "lucide-react";
import ChatFeed from "@/components/ChatFeed";
import ConnectPanel from "@/components/ConnectPanel";
import YouTubeConnectPanel from "@/components/YouTubeConnectPanel";
import { cn } from "@/lib/utils";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useT } from "@/contexts/LocaleContext";

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
  const { messages } = useT();
  const [platform, setPlatform] = useState<"kick" | "youtube">("kick");

  return (
    <section>
      <SectionHeading
        eyebrow={messages.connect.pageEyebrow}
        title={messages.connect.pageTitle}
        subtitle={messages.connect.pageSubtitle}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div className="space-y-3">
            <div className="glass inline-flex gap-1 rounded-2xl p-1">
              <PlatformTab
                active={platform === "kick"}
                live={chat.kick.status === "live"}
                onClick={() => setPlatform("kick")}
                label={messages.connect.tabKick}
                icon={<Radio className="size-4" />}
                activeClass="bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] text-primary-foreground"
              />
              <PlatformTab
                active={platform === "youtube"}
                live={chat.youtube.status === "live"}
                onClick={() => setPlatform("youtube")}
                label={messages.connect.tabYoutube}
                icon={<Youtube className="size-4" />}
                activeClass="bg-gradient-to-l from-red-500 to-rose-600 text-white"
              />
            </div>
            {platform === "kick" ? (
              <ConnectPanel
                status={chat.kick.status}
                channel={chat.kick.channel}
                onConnect={chat.connect}
                onStop={chat.kick.stop}
              />
            ) : (
              <YouTubeConnectPanel />
            )}
          </div>
        </Reveal>
        <Reveal delay={120} className="relative">
          <ChatFeed
            messages={chat.messages}
            status={chat.status}
            channel={chat.channel}
            className="h-[28rem] lg:absolute lg:inset-0 lg:h-auto"
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
          title={messages.connect.perkFast}
          desc={messages.connect.perkFastDesc}
          accent="var(--neon)"
        />
        <PerkCard
          icon={<ShieldCheck className="size-5" />}
          title={messages.connect.perkSafe}
          desc={messages.connect.perkSafeDesc}
          accent="var(--neon-2)"
        />
        <PerkCard
          icon={<Radio className="size-5" />}
          title={messages.connect.perkLive}
          desc={messages.connect.perkLiveDesc}
          accent="var(--neon-3)"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/60">
        <Sparkles className="size-3.5 text-primary" />
        <span>
          {messages.connect.obsHint}{" "}
          <span
            className="font-brand mx-1 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-bold text-primary"
            dir="ltr"
          >
            /connect?channel=اسمك
          </span>
        </span>
      </div>
    </section>
  );
}

function PlatformTab({
  active,
  live,
  onClick,
  label,
  icon,
  activeClass,
}: {
  active: boolean;
  live: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition duration-300",
        active
          ? cn(activeClass, "shadow-[0_10px_30px_-14px_currentColor]")
          : "text-white/65 hover:bg-white/8 hover:text-white",
      )}
    >
      {icon}
      {label}
      {live ? (
        <span className="size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
      ) : null}
    </button>
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
        <h3
          className="mt-3 text-base font-extrabold"
          style={{ color: `color-mix(in oklab, ${accent} 60%, white 40%)` }}
        >
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-white/60">{desc}</p>
      </div>
    </div>
  );
}
