import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  PlugZap,
  Radio,
  Users,
} from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { checkKickLiveStatuses, resolveKickChannel } from "@/lib/kick.functions";
import { saveKickSession } from "@/lib/kick-session";
import { VERIFIED_STREAMERS } from "@/lib/verified-streamers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function cleanSlug(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?kick\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "")
    .toLowerCase();
}

function looksLikeSlug(value: string) {
  return /^[a-z0-9_-]{2,60}$/i.test(value);
}

export default function HomeVerifiedSidebar() {
  const chat = useKickChatContext();
  const resolve = useServerFn(resolveKickChannel);
  const checkLive = useServerFn(checkKickLiveStatuses);

  const [liveMap, setLiveMap] = useState<Record<string, boolean | null>>(() =>
    Object.fromEntries(VERIFIED_STREAMERS.map((s) => [s.slug, null])),
  );
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const live = chat.status === "live";
  const busy = chat.status === "connecting" || connectingSlug !== null;
  const connectedSlug = chat.channel?.replace(/^kick\.com\//i, "").toLowerCase() ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const statuses = await checkLive({
          data: { slugs: VERIFIED_STREAMERS.map((s) => s.slug) },
        });
        if (cancelled) return;
        setLiveMap((prev) => {
          const next = { ...prev };
          for (const s of VERIFIED_STREAMERS) {
            next[s.slug] = statuses[s.slug] ?? false;
          }
          return next;
        });
      } catch {
        if (cancelled) return;
        setLiveMap((prev) => {
          const next = { ...prev };
          for (const s of VERIFIED_STREAMERS) next[s.slug] = false;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkLive]);

  const connectSlug = async (raw: string) => {
    setErr(null);
    const slug = cleanSlug(raw);
    if (!looksLikeSlug(slug)) {
      setErr("اسم القناة غير صالح.");
      return;
    }

    setConnectingSlug(slug);
    try {
      const info = await resolve({ data: { slug } });
      saveKickSession({ slug: info.slug, chatroomId: info.chatroomId, channelId: info.channelId });
      chat.connect(info.chatroomId, `kick.com/${info.slug}`, info.slug, info.channelId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الربط.");
    } finally {
      setConnectingSlug(null);
    }
  };

  return (
    <aside className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#101a18] lg:w-[22rem]">
      <div className="border-b border-white/8 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.22em] text-primary uppercase">
              <BadgeCheck className="size-3.5" />
              Verified
            </p>
            <h2 className="mt-1 text-xl font-extrabold leading-tight">الستريمر الموثقين</h2>
            <p className="mt-1 text-xs leading-5 text-white/60">اربط بكبسة وابدأ اللعب</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Users className="size-4" />
          </span>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2.5",
            live ? "border-primary/35 bg-primary/10" : "border-white/10 bg-white/5",
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              live ? "animate-pulse bg-primary" : "bg-white/35",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-white/50">حالة الربط</p>
            <p className="truncate text-xs font-extrabold" dir="ltr">
              {live ? chat.channel : "غير متصل"}
            </p>
          </div>
          {live ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 text-[11px] font-bold"
              onClick={() => chat.stop()}
            >
              قطع
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <ul className="space-y-2">
          {VERIFIED_STREAMERS.map((s) => {
            const isLive = liveMap[s.slug];
            const isConnected = connectedSlug === s.slug;
            const isConnecting = connectingSlug === s.slug;

            return (
              <li key={s.slug}>
                <div
                  className={cn(
                    "group rounded-2xl border p-3 transition-colors",
                    isConnected
                      ? "border-primary/45 bg-primary/10"
                      : "border-white/8 bg-white/[0.03] hover:border-primary/25 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold uppercase text-white shadow-inner"
                      style={{
                        background: `linear-gradient(145deg, oklch(0.42 0.1 ${s.hue ?? 155}), oklch(0.28 0.06 ${s.hue ?? 155}))`,
                      }}
                    >
                      {s.name.slice(0, 2)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-extrabold">{s.name}</p>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide",
                            isLive === true && "bg-destructive/90 text-white",
                            isLive === false && "bg-white/8 text-white/45",
                            isLive == null && "bg-white/8 text-white/40",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1 rounded-full",
                              isLive === true && "animate-pulse bg-white",
                              isLive === false && "bg-white/40",
                              isLive == null && "animate-pulse bg-white/50",
                            )}
                          />
                          {isLive === true ? "LIVE" : isLive === false ? "OFF" : "…"}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-white/45" dir="ltr">
                        kick.com/{s.slug}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || isConnected}
                      className="h-9 flex-1 rounded-xl text-xs font-extrabold"
                      onClick={() => void connectSlug(s.slug)}
                    >
                      {isConnecting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : isConnected ? (
                        <>
                          <Radio className="size-3.5" />
                          متصل
                        </>
                      ) : (
                        <>
                          <PlugZap className="size-3.5" />
                          ربط
                        </>
                      )}
                    </Button>
                    <Button
                      asChild
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl border-white/12 bg-black/20 px-3"
                    >
                      <a href={`https://kick.com/${s.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2 border-t border-white/8 p-4 sm:p-5">
        <p className="text-[11px] font-bold text-white/55">ربط قناة أخرى</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void connectSlug(customInput);
          }}
        >
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="kick.com/اسمك"
            dir="ltr"
            className="h-10 flex-1 rounded-xl border-white/10 bg-black/25 text-sm font-semibold"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !customInput.trim()} className="h-10 shrink-0 px-4 font-extrabold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
          </Button>
        </form>
        {err ? <p className="text-xs font-semibold text-destructive">{err}</p> : null}
        <Button asChild variant="ghost" className="h-9 w-full text-xs font-bold text-white/65 hover:text-white">
          <Link to="/streamers">عرض الكروت الكاملة ←</Link>
        </Button>
      </div>
    </aside>
  );
}
