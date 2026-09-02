import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, PlugZap, Radio, Users } from "lucide-react";
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
    <aside className="glass-strong flex min-h-0 shrink-0 flex-col overflow-hidden rounded-3xl lg:w-[21rem] xl:w-[22rem]">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/10 p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 100% at 100% 0%, color-mix(in oklab, var(--neon) 22%, transparent), transparent 55%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="chip !text-[10px] !tracking-[0.22em]">
              <BadgeCheck className="size-3" />
              Verified
            </span>
            <h2 className="mt-1.5 text-lg font-extrabold leading-tight text-white">الستريمر الموثقين</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-white/60">اربط بكبسة وابدأ اللعب</p>
          </div>
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_30px_-10px_var(--neon)]"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--neon) 90%, white 10%), color-mix(in oklab, var(--neon-3) 90%, white 10%))",
            }}
          >
            <Users className="size-4" />
          </span>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2.5 backdrop-blur",
            live ? "border-primary/40 bg-primary/12" : "border-white/12 bg-white/[0.03]",
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              live ? "animate-live-dot bg-primary" : "bg-white/35",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-wider text-white/50 uppercase">حالة الربط</p>
            <p className="truncate text-xs font-extrabold text-white" dir="ltr">
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

      {/* Streamers list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
        <ul className="space-y-1.5">
          {VERIFIED_STREAMERS.map((s) => {
            const isLive = liveMap[s.slug];
            const isConnected = connectedSlug === s.slug;
            const isConnecting = connectingSlug === s.slug;

            return (
              <li key={s.slug}>
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-2.5 transition-[border-color,background-color,box-shadow,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isConnected
                      ? "border-primary/50 bg-primary/10 shadow-[0_10px_30px_-15px_var(--neon)]"
                      : "border-white/8 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.06] hover:shadow-[0_16px_40px_-22px_oklch(0_0_0_/_0.85)]",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold uppercase text-white shadow-inner"
                      style={{
                        background: `linear-gradient(145deg, oklch(0.5 0.15 ${s.hue ?? 305}), oklch(0.28 0.09 ${s.hue ?? 305}))`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px -6px oklch(0.5 0.2 ${s.hue ?? 305} / 0.6)`,
                      }}
                    >
                      {s.name.slice(0, 2)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-extrabold text-white">{s.name}</p>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider",
                            isLive === true && "bg-destructive text-white shadow-[0_0_10px_-2px_var(--destructive)]",
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
                      <p className="truncate text-[10px] text-white/45" dir="ltr">
                        kick.com/{s.slug}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || isConnected}
                      className={cn(
                        "h-9 shrink-0 rounded-xl px-3 text-[11px] font-extrabold",
                        isConnected && "bg-primary/25 text-primary hover:bg-primary/30",
                      )}
                      onClick={() => void connectSlug(s.slug)}
                    >
                      {isConnecting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : isConnected ? (
                        <>
                          <Radio className="size-3" />
                          متصل
                        </>
                      ) : (
                        <>
                          <PlugZap className="size-3" />
                          ربط
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Custom connect */}
      <div className="space-y-2 border-t border-white/10 bg-black/20 p-3.5">
        <p className="text-[10px] font-bold tracking-wider text-white/55 uppercase">ربط قناة أخرى</p>
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
            className="h-10 flex-1 rounded-xl border-white/12 bg-black/30 text-sm font-semibold placeholder:text-white/30"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !customInput.trim()} className="h-10 shrink-0 px-3.5 font-extrabold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
          </Button>
        </form>
        {err ? <p className="text-xs font-semibold text-destructive">{err}</p> : null}
        <Button
          asChild
          variant="ghost"
          className="h-8 w-full text-[11px] font-bold text-white/60 hover:text-white"
        >
          <Link to="/streamers">عرض الكروت الكاملة ←</Link>
        </Button>
      </div>
    </aside>
  );
}
