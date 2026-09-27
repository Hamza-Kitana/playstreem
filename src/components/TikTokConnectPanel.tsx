import { Check, Download, Loader2, PlugZap, X } from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useT } from "@/contexts/LocaleContext";
import TikTokIcon from "@/components/TikTokIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TIKTOK_EXTENSION_URL = "/al-daboor-tiktok.zip";

export default function TikTokConnectPanel() {
  const { tiktok } = useKickChatContext();
  const { messages } = useT();
  const c = messages.connect;

  const connected = tiktok.status === "live";
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
          <div className="space-y-4">
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
                ok={tiktok.liveChannel != null}
                value={tiktok.liveChannel ? `@${tiktok.liveChannel}` : c.ttLiveTabMissing}
              />
            </div>

            <Button
              type="button"
              onClick={tiktok.connect}
              disabled={tiktok.enabled && tiktok.status === "connecting"}
              className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-l from-[#fe2c55] to-[#c026d3] text-base font-extrabold text-white shadow-[0_20px_50px_-14px_rgba(254,44,85,0.8)] hover:brightness-110"
            >
              {tiktok.enabled && tiktok.status === "connecting" ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {c.ttWaiting}
                </>
              ) : (
                <>
                  <PlugZap className="size-5" />
                  {c.ttEnable}
                </>
              )}
            </Button>
          </div>
        )}

        {tiktok.error === "noExtension" ? (
          <p className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-extrabold text-destructive">
            {c.ttErrNoExtension}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-6 font-semibold text-white/45">{c.ttNote}</p>
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
