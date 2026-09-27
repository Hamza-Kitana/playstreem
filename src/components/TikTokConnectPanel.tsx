import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, Download, Loader2, PlugZap, Puzzle, X } from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useT } from "@/contexts/LocaleContext";
import TikTokIcon from "@/components/TikTokIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const TIKTOK_EXTENSION_URL = "/al-daboor-tiktok.zip";

export default function TikTokConnectPanel() {
  const { tiktok } = useKickChatContext();
  const { messages } = useT();
  const c = messages.connect;
  const [input, setInput] = useState("");
  const [altOpen, setAltOpen] = useState(false);

  const connected = tiktok.status === "live";
  const directBusy = tiktok.mode === "direct" && tiktok.status === "connecting";
  const extensionWaiting = tiktok.mode === "extension" && tiktok.status === "connecting";

  useEffect(() => {
    if (tiktok.mode === "extension" || tiktok.error === "notConfigured") setAltOpen(true);
  }, [tiktok.mode, tiktok.error]);

  const errorText =
    tiktok.error === "invalid"
      ? c.ttErrInvalid
      : tiktok.error === "notLive"
        ? c.ttErrNotLive
        : tiktok.error === "ended"
          ? c.ttErrEnded
          : tiktok.error === "busy"
            ? c.ttErrBusy
            : tiktok.error === "notConfigured"
              ? c.ttErrNotConfigured
              : tiktok.error === "lost"
                ? c.ttErrLost
                : tiktok.error === "failed"
                  ? c.ttErrFailed
                  : tiktok.error === "noExtension"
                    ? c.ttErrNoExtension
                    : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (value.length < 2) return;
    void tiktok.connect(value);
  };

  const steps = [c.ttStep1, c.ttStep2, c.ttStep3, c.ttStep4];

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#fe2c55] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-[#25f4ee] opacity-15 blur-3xl" />

      <div className="relative">
        <div className="mb-6 flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-black text-white shadow-[3px_3px_0_#fe2c55,-3px_-3px_0_#25f4ee]">
            <TikTokIcon className="size-5" />
          </span>
          <div>
            <h3 className="font-brand text-xl font-bold">{c.ttPanelTitle}</h3>
            <p className="mt-0.5 text-sm text-white/60">{c.ttPanelSubtitle}</p>
          </div>
        </div>

        {connected ? (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#25f4ee]/30 bg-[#25f4ee]/10 p-4">
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-[#25f4ee]/15 px-4 py-2.5 text-sm font-extrabold text-cyan-100">
              <span className="size-2 animate-pulse rounded-full bg-[#25f4ee] shadow-[0_0_12px_rgba(37,244,238,0.9)]" />
              {c.connectedTo} <span dir="ltr">{tiktok.channel}</span>
            </span>
            <Button
              variant="secondary"
              onClick={tiktok.stop}
              className="h-11 gap-1.5 rounded-2xl bg-white/8 font-extrabold hover:bg-white/15"
            >
              <X className="size-4" />
              {c.disconnect}
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-3.5">
              <label className="block space-y-2">
                <span className="text-sm font-extrabold text-white/85">{c.ttInputLabel}</span>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={c.ttInputPlaceholder}
                  dir="ltr"
                  className="h-[3.25rem] rounded-2xl border-white/12 bg-black/30 text-base font-semibold shadow-inner placeholder:font-normal placeholder:text-white/30"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={directBusy}
                />
              </label>
              <Button
                type="submit"
                disabled={directBusy || input.trim().length < 2}
                className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-l from-[#fe2c55] to-[#c026d3] text-base font-extrabold text-white shadow-[0_20px_50px_-14px_rgba(254,44,85,0.8)] hover:brightness-110"
              >
                {directBusy ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    {c.connecting}
                  </>
                ) : (
                  <>
                    <PlugZap className="size-5" />
                    {c.ttConnect}
                  </>
                )}
              </Button>
              <p className="text-xs leading-6 text-white/50" dir="auto">
                {c.ttExample}
              </p>
            </form>

            {errorText ? (
              <p className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-extrabold text-destructive">
                {errorText}
              </p>
            ) : null}

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/20">
              <button
                type="button"
                onClick={() => setAltOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-start text-sm font-extrabold text-white/80 transition hover:text-white"
                aria-expanded={altOpen}
              >
                <Puzzle className="size-4 text-[#25f4ee]" />
                <span className="flex-1">{c.ttAltTitle}</span>
                <ChevronDown className={cn("size-4 transition", altOpen && "rotate-180")} />
              </button>

              {altOpen ? (
                <div className="space-y-4 border-t border-white/8 px-4 pt-3 pb-4">
                  <p className="text-xs leading-6 font-semibold text-white/55">{c.ttAltHint}</p>
                  <ol className="space-y-2.5">
                    {steps.map((step, i) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/25 px-3.5 py-3 text-sm leading-6 font-semibold text-white/85"
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#25f4ee] to-[#fe2c55] text-xs font-black text-black">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          {step}
                          {i === 0 ? (
                            <a
                              href={TIKTOK_EXTENSION_URL}
                              download
                              className="mt-2 flex w-fit items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-white/20"
                            >
                              <Download className="size-3.5" />
                              {c.ttDownload}
                            </a>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <StatusPill
                      label={c.ttExtension}
                      ok={tiktok.extensionInstalled}
                      value={tiktok.extensionInstalled ? c.ttExtensionOk : c.ttExtensionMissing}
                    />
                    <StatusPill
                      label={c.ttLiveTab}
                      ok={tiktok.extensionChannel != null}
                      value={
                        tiktok.extensionChannel ? `@${tiktok.extensionChannel}` : c.ttLiveTabMissing
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={tiktok.connectExtension}
                    disabled={extensionWaiting}
                    className="h-12 w-full rounded-2xl bg-white/10 text-sm font-extrabold hover:bg-white/15"
                  >
                    {extensionWaiting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {c.ttWaiting}
                      </>
                    ) : (
                      <>
                        <Puzzle className="size-4" />
                        {c.ttEnable}
                      </>
                    )}
                  </Button>
                  <p className="text-xs leading-6 font-semibold text-white/45">{c.ttNote}</p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusPill({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-bold",
        ok ? "border-emerald-400/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.04]",
      )}
    >
      <span className="text-white/70">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          ok ? "text-emerald-300" : "text-white/45",
        )}
        dir="auto"
      >
        {ok ? <Check className="size-4" /> : <X className="size-4" />}
        {value}
      </span>
    </div>
  );
}
