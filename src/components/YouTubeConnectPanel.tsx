import { useEffect, useState, type FormEvent } from "react";
import { Loader2, PlugZap, X, Youtube } from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useT } from "@/contexts/LocaleContext";
import { loadYouTubeSession } from "@/lib/youtube-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function YouTubeConnectPanel() {
  const { youtube } = useKickChatContext();
  const { messages } = useT();
  const c = messages.connect;
  const [input, setInput] = useState("");

  useEffect(() => {
    const session = loadYouTubeSession();
    if (session) setInput(session.input);
  }, []);

  const connected = youtube.status === "live";
  const busy = youtube.status === "connecting";

  const errorText =
    youtube.error === "invalid"
      ? c.ytErrInvalid
      : youtube.error === "notLive"
        ? c.ytErrNotLive
        : youtube.error === "lost"
          ? c.ytErrLost
          : youtube.error === "failed"
            ? c.ytErrFailed
            : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (value.length < 2) return;
    void youtube.connect(value);
  };

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-red-500 opacity-25 blur-3xl" />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--neon-2)" }}
      />

      <div className="relative">
        <div className="mb-6 flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_20px_50px_-20px_rgba(239,68,68,0.9)]">
            <Youtube className="size-5" />
          </span>
          <div>
            <h3 className="font-brand text-xl font-bold">{c.ytPanelTitle}</h3>
            <p className="mt-0.5 text-sm text-white/60">{c.ytPanelSubtitle}</p>
          </div>
        </div>

        {connected ? (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-red-400/30 bg-red-500/10 p-4">
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-red-500/20 px-4 py-2.5 text-sm font-extrabold text-red-200">
              <span className="size-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" />
              {c.connectedTo} <span dir="ltr">{youtube.channel}</span>
            </span>
            <Button
              variant="secondary"
              onClick={youtube.stop}
              className="h-11 gap-1.5 rounded-2xl bg-white/8 font-extrabold hover:bg-white/15"
            >
              <X className="size-4" />
              {c.disconnect}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3.5">
            <label className="block space-y-2">
              <span className="text-sm font-extrabold text-white/85">{c.ytInputLabel}</span>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={c.ytInputPlaceholder}
                dir="ltr"
                className="h-[3.25rem] rounded-2xl border-white/12 bg-black/30 text-base font-semibold shadow-inner placeholder:font-normal placeholder:text-white/30"
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
            </label>
            <Button
              type="submit"
              disabled={busy || input.trim().length < 2}
              className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-l from-red-500 to-rose-600 text-base font-extrabold text-white shadow-[0_20px_50px_-14px_rgba(239,68,68,0.8)] hover:brightness-110"
            >
              {busy ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {c.connecting}
                </>
              ) : (
                <>
                  <PlugZap className="size-5" />
                  {c.ytConnect}
                </>
              )}
            </Button>
            <p className="text-xs leading-6 text-white/50" dir="auto">
              {c.ytExample}
            </p>
          </form>
        )}

        {errorText && !connected ? (
          <p className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-extrabold text-destructive">
            {errorText}
          </p>
        ) : null}

        <p className="mt-4 text-xs font-semibold text-white/45">{c.ytBothHint}</p>
      </div>
    </div>
  );
}
