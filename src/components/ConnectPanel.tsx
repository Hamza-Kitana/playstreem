import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { ClipboardPaste, Loader2, PlugZap, Radio, X } from "lucide-react";
import { resolveKickChannel } from "@/lib/kick.functions";
import { loadKickSession, loadLegacyKickSlug, saveKickSession } from "@/lib/kick-session";
import type { ChatStatus } from "@/hooks/useKickChat";
import { useT } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export default function ConnectPanel({
  status,
  channel,
  onConnect,
  onStop,
}: {
  status: ChatStatus;
  channel: string | null;
  onConnect: (chatroomId: number, label: string, slug?: string, channelId?: number) => void;
  onStop: () => void;
}) {
  const { messages } = useT();
  const resolve = useServerFn(resolveKickChannel);
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const connected = status === "live";
  const busy = loading || status === "connecting";

  useEffect(() => {
    if (prefilled) return;
    const params = new URLSearchParams(search);
    const fromUrl = params.get("channel") || params.get("kick");
    if (fromUrl) {
      setInput(cleanSlug(fromUrl));
      setPrefilled(true);
      return;
    }
    const session = loadKickSession();
    if (session) {
      setInput(session.slug);
      setPrefilled(true);
      return;
    }
    const legacy = loadLegacyKickSlug();
    if (legacy) setInput(legacy);
    setPrefilled(true);
  }, [search, prefilled]);

  const connectWith = async (raw: string, source: string) => {
    setErr(null);
    setHint(null);

    const slug = cleanSlug(raw);
    if (!looksLikeSlug(slug)) {
      setErr(messages.connect.invalidSlug);
      return;
    }

    setLoading(true);
    try {
      const info = await resolve({ data: { slug } });
      saveKickSession({ slug: info.slug, chatroomId: info.chatroomId, channelId: info.channelId });
      setInput(info.slug);
      setHint(messages.connect.connectedVia.replace("{source}", source));
      onConnect(info.chatroomId, `kick.com/${info.slug}`, info.slug, info.channelId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : messages.connect.connectFailed);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void connectWith(input, messages.connect.sourceInput);
  };

  const pasteFromClipboard = async () => {
    setErr(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) {
        setErr(messages.connect.emptyClipboard);
        return;
      }
      setInput(text.trim());
      await connectWith(text, messages.connect.sourceClipboard);
    } catch {
      setErr(messages.connect.clipboardFailed);
    }
  };

  useEffect(() => {
    if (connected || busy) return;
    const params = new URLSearchParams(search);
    const fromUrl = params.get("channel") || params.get("kick");
    if (!fromUrl) return;
    void connectWith(fromUrl, messages.connect.sourcePageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when channel search arrives
  }, [search]);

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--neon)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--neon-2)" }}
      />

      <div className="relative">
        <div className="mb-6 flex items-center gap-3.5">
          <span
            className="grid size-12 place-items-center rounded-2xl text-white shadow-[0_20px_50px_-20px_var(--neon)]"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--neon) 92%, white 8%), color-mix(in oklab, var(--neon-3) 92%, white 8%))",
            }}
          >
            <Radio className="size-5" />
          </span>
          <div>
            <h3 className="font-brand text-xl font-bold">{messages.connect.panelTitle}</h3>
            <p className="mt-0.5 text-sm text-white/60">{messages.connect.panelSubtitle}</p>
          </div>
        </div>

        {connected ? (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-4">
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-primary/20 px-4 py-2.5 text-sm font-extrabold text-primary">
              <span className="size-2 animate-pulse rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
              {messages.connect.connectedTo} <span dir="ltr">{channel}</span>
            </span>
            <Button
              variant="secondary"
              onClick={onStop}
              className="h-11 gap-1.5 rounded-2xl bg-white/8 font-extrabold hover:bg-white/15"
            >
              <X className="size-4" />
              {messages.connect.disconnect}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {status === "connecting" ? (
              <p className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                <Loader2 className="size-4 animate-spin" />
                {messages.connect.restoring}
              </p>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-3.5">
              <label className="block space-y-2">
                <span className="text-sm font-extrabold text-white/85">
                  {messages.connect.inputLabel}
                </span>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={messages.connect.inputPlaceholder}
                  dir="ltr"
                  className="h-[3.25rem] rounded-2xl border-white/12 bg-black/30 text-base font-semibold shadow-inner placeholder:font-normal placeholder:text-white/30"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="h-[3.25rem] flex-1 rounded-2xl bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] text-base font-extrabold shadow-[0_20px_50px_-14px_var(--neon)] hover:brightness-110"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      {messages.connect.connecting}
                    </>
                  ) : (
                    <>
                      <PlugZap className="size-5" />
                      {messages.connect.connectChannel}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void pasteFromClipboard()}
                  className="h-[3.25rem] rounded-2xl border-white/15 bg-white/[0.03] px-5 font-bold hover:bg-white/[0.08] sm:w-auto"
                >
                  <ClipboardPaste className="size-4" />
                  {messages.connect.pasteConnect}
                </Button>
              </div>
            </form>

            <p className="text-xs leading-6 text-white/50">
              {messages.connect.example}{" "}
              <span className="font-brand rounded-md bg-black/40 px-1.5 py-0.5 text-primary" dir="ltr">
                https://kick.com/salahat8
              </span>{" "}
              {messages.connect.exampleSuffix}
            </p>

            {hint ? (
              <p className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-extrabold text-primary">
                {hint}
              </p>
            ) : null}
            {err ? (
              <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-extrabold text-destructive">
                {err}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
