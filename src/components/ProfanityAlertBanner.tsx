import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Volume2, VolumeX, X } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { useChatAnalytics } from "@/contexts/ChatAnalyticsContext";
import ChatEmoteText from "@/components/ChatEmoteText";
import { isAlertMuted, setAlertMuted } from "@/lib/alert-sound";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProfanityAlertBanner() {
  const { messages: t } = useT();
  const p = t.pages.chat;
  const { activeProfanity, dismissProfanity } = useChatAnalytics();
  const [muted, setMuted] = useState(isAlertMuted);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!activeProfanity) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 9000);
    return () => window.clearTimeout(id);
  }, [activeProfanity]);

  if (!activeProfanity || !visible) return null;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAlertMuted(next);
  };

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto fixed inset-x-3 top-24 z-[60] mx-auto max-w-2xl sm:top-28",
        "animate-in slide-in-from-top-4 fade-in duration-300",
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/95 via-rose-900/90 to-orange-950/90 shadow-[0_0_40px_-12px_rgba(244,63,94,0.7)] backdrop-blur-xl">
        <div className="relative flex items-start gap-3 px-4 py-3.5 pe-14 sm:px-5 sm:pe-16">
          <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/20 text-rose-300">
            <ShieldAlert className="size-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-rose-200 uppercase">
              <AlertTriangle className="size-3.5" />
              {p.profanityTitle}
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {p.profanityBody.replace("{user}", activeProfanity.user)}
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-7 text-rose-100/80">
              <ChatEmoteText text={activeProfanity.text} size="md" />
            </p>
            <p className="mt-2 text-[11px] font-semibold text-rose-300/80">{p.profanityHint}</p>
          </div>

          <div className="absolute end-2.5 top-2.5 flex items-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 rounded-full border border-white/20 bg-black/40 text-white hover:bg-white/15 hover:text-white"
              onClick={toggleMute}
              aria-label={muted ? p.unmute : p.mute}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 rounded-full border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={dismissProfanity}
              aria-label={p.dismiss}
            >
              <X className="size-4 stroke-[2.5]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
