import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, PlugZap, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import GameCountdownOverlay from "@/components/games/GameCountdownOverlay";
import GameMomentOverlay from "@/components/games/GameMomentOverlay";
import { Button } from "@/components/ui/button";
import type { GameMoment } from "@/lib/game-moments";
import { cn } from "@/lib/utils";

export type Phase = "setup" | "ready" | "playing";

type GameStageProps = {
  phase: Phase;
  accent: string;
  glow: string;
  /** Game icon shown in the setup hero. */
  icon: ReactNode;
  /** Big title for the setup hero. */
  title: string;
  /** Short tagline shown below the title. */
  description: string;
  /** Whether the Kick chat is connected. */
  chatActive: boolean;
  /** Enable the "next / start" button in setup / ready phases. */
  canStart?: boolean;
  /** Text for the primary CTA in setup phase (defaults to "التالي"). */
  setupCtaLabel?: string;
  /** Text for the ready phase start button (defaults to "ابدأ اللعبة"). */
  startLabel?: string;
  /** Slot rendered inside the setup hero — user's settings inputs. */
  settings: ReactNode;
  /** Slot rendered while playing — the actual game panel. */
  play: ReactNode;
  /** Full-screen in-play announcement (timeout, win, lose…). */
  moment?: GameMoment | null;
  /** Called when the moment overlay is dismissed without a custom action. */
  onDismissMoment?: () => void;
  /** Called when the user finishes the setup phase (moves to ready). */
  onGoReady: () => void;
  /** Called after the 3-2-1 countdown when the user starts from the ready phase. */
  onStart: () => void;
  /** Called when the user hits "تعديل الإعدادات" to go back to setup. */
  onBackToSetup: () => void;
  /** Optional: extra bits (rules, badges) shown at the bottom of the setup card. */
  setupExtras?: ReactNode;
};

/**
 * Shared full-width stage for every game. Renders three phases:
 * 1. `setup`   — a large, centred configuration card
 * 2. `ready`   — a bold "start" card confirming the settings
 * 3. `playing` — the actual game panel with a small controls bar
 */
export default function GameStage({
  phase,
  accent,
  glow,
  icon,
  title,
  description,
  chatActive,
  canStart = true,
  setupCtaLabel = "التالي",
  startLabel = "ابدأ اللعبة",
  settings,
  play,
  moment = null,
  onDismissMoment,
  onGoReady,
  onStart,
  onBackToSetup,
  setupExtras,
}: GameStageProps) {
  return (
    <div className="game-page overflow-hidden">
      {phase === "setup" ? (
        <SetupStage
          accent={accent}
          glow={glow}
          icon={icon}
          title={title}
          description={description}
          chatActive={chatActive}
          canStart={canStart}
          ctaLabel={setupCtaLabel}
          onGoReady={onGoReady}
          settings={settings}
          setupExtras={setupExtras}
        />
      ) : phase === "ready" ? (
        <ReadyStage
          accent={accent}
          glow={glow}
          icon={icon}
          title={title}
          startLabel={startLabel}
          chatActive={chatActive}
          canStart={canStart}
          onStart={onStart}
          onBackToSetup={onBackToSetup}
        />
      ) : (
        <PlayingStage
          accent={accent}
          glow={glow}
          title={title}
          moment={moment}
          onDismissMoment={onDismissMoment}
          onBackToSetup={onBackToSetup}
        >
          {play}
        </PlayingStage>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SetupStage({
  accent,
  glow,
  icon,
  title,
  description,
  chatActive,
  canStart,
  ctaLabel,
  onGoReady,
  settings,
  setupExtras,
}: {
  accent: string;
  glow: string;
  icon: ReactNode;
  title: string;
  description: string;
  chatActive: boolean;
  canStart: boolean;
  ctaLabel: string;
  onGoReady: () => void;
  settings: ReactNode;
  setupExtras?: ReactNode;
}) {
  const disabled = !chatActive || !canStart;
  return (
    <div className="flex h-full min-h-0 w-full animate-[stage-in_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div
        className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.25rem] border p-3 sm:rounded-[1.5rem] sm:p-5 lg:p-6"
        style={{
          borderColor: `${accent}55`,
          background: `
            radial-gradient(140% 90% at 100% 0%, ${accent}30, transparent 55%),
            radial-gradient(100% 100% at 0% 100%, ${glow}22, transparent 60%),
            linear-gradient(180deg, oklch(0.16 0.06 290 / 0.85), oklch(0.11 0.05 290 / 0.94))
          `,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 90px -30px ${accent}66`,
        }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-40 blur-3xl"
          style={{ background: accent }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full opacity-30 blur-3xl"
          style={{ background: glow }}
        />

        <div className="relative grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2 lg:gap-6 xl:gap-8">
          <div className="flex min-h-0 flex-col justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-4">
              <span
                className="grid size-[4.5rem] shrink-0 place-items-center rounded-3xl text-white shadow-[0_20px_60px_-16px_rgba(0,0,0,0.6)] sm:size-20"
                style={{ background: `linear-gradient(135deg, ${accent}, ${glow})` }}
              >
                <span className="[&_svg]:size-9 sm:[&_svg]:size-10">{icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-extrabold tracking-[0.18em] uppercase"
                  style={{
                    borderColor: `${accent}66`,
                    color: glow,
                    background: `${accent}18`,
                  }}
                >
                  الخطوة ١ · الإعدادات
                </span>
                <h3 className="font-brand mt-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
                  {title}
                </h3>
              </div>
            </div>
            <p className="text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              {description}
            </p>
          </div>

          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur sm:p-5">
              {settings}
            </div>
            {setupExtras ? <div className="shrink-0 text-sm sm:text-base">{setupExtras}</div> : null}
          </div>
        </div>

        <div className="relative mt-3 flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:mt-4">
          {!chatActive ? (
            <Button
              asChild
              variant="ghost"
              className="h-12 gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 text-base font-extrabold text-destructive hover:bg-destructive/15 sm:max-w-[50%]"
            >
              <Link to="/connect">
                <PlugZap className="size-5" />
                اربط الشات أول
              </Link>
            </Button>
          ) : (
            <p className="flex items-center gap-2 text-sm font-extrabold tracking-wider text-white/55 uppercase">
              <Sparkles className="size-4" style={{ color: accent }} />
              جاهزين · بس اضغط التالي
            </p>
          )}

          <Button
            type="button"
            disabled={disabled}
            onClick={onGoReady}
            className={cn(
              "h-14 w-full gap-2 rounded-2xl px-8 text-xl font-extrabold text-white transition hover:brightness-110 sm:ms-auto sm:w-auto sm:min-w-[18rem]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            style={{
              background: `linear-gradient(135deg, ${accent}, ${glow})`,
              boxShadow: `0 20px 55px -15px ${accent}`,
            }}
          >
            {ctaLabel}
            <ArrowLeft className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ReadyStage({
  accent,
  glow,
  icon,
  title,
  startLabel,
  chatActive,
  canStart,
  onStart,
  onBackToSetup,
}: {
  accent: string;
  glow: string;
  icon: ReactNode;
  title: string;
  startLabel: string;
  chatActive: boolean;
  canStart: boolean;
  onStart: () => void;
  onBackToSetup: () => void;
}) {
  const [pulse, setPulse] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 600);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    const delay = countdown === 0 ? 700 : 1000;
    const id = window.setTimeout(() => {
      if (countdown === 0) {
        setCountdown(null);
        onStart();
      } else {
        setCountdown(countdown - 1);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [countdown, onStart]);

  const disabled = !chatActive || !canStart || countdown !== null;

  const beginCountdown = () => {
    if (disabled) return;
    setCountdown(3);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden animate-[stage-in_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[1.25rem] border p-6 text-center sm:rounded-[1.5rem] sm:p-10 lg:p-12",
          pulse && "animate-pop-in",
        )}
        style={{
          borderColor: `${accent}66`,
          background: `
            radial-gradient(80% 70% at 50% 0%, ${accent}35, transparent 60%),
            radial-gradient(80% 70% at 50% 100%, ${glow}22, transparent 65%),
            linear-gradient(180deg, oklch(0.14 0.05 290 / 0.9), oklch(0.10 0.04 290 / 0.95))
          `,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 40px 100px -30px ${accent}80`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `conic-gradient(from 210deg at 50% 50%, ${accent}22, transparent 55%, ${glow}25, transparent)`,
          }}
        />

        <div className="relative">
          <span
            className="mx-auto grid size-24 place-items-center rounded-3xl text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:size-28"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${glow})`,
              boxShadow: `0 0 60px -10px ${accent}`,
            }}
          >
            <span className="[&_svg]:size-12 sm:[&_svg]:size-14">{icon}</span>
          </span>

          <p
            className="mt-6 text-sm font-extrabold tracking-[0.28em] uppercase sm:text-base"
            style={{ color: glow }}
          >
            الخطوة ٢ · جاهز؟
          </p>
          <h2 className="font-brand mt-3 text-4xl font-bold sm:text-5xl lg:text-6xl">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, ${accent}, white 55%, ${glow})`,
              }}
            >
              {title}
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
            الإعدادات محفوظة. لما تكون جاهز، اضغط الزر تحت وابدأ العد التنازلي.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10">
            <Button
              type="button"
              disabled={disabled}
              onClick={beginCountdown}
              className="h-[4.25rem] min-w-[min(100%,20rem)] gap-2 rounded-3xl px-10 text-2xl font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[22rem]"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${glow})`,
                boxShadow: `0 25px 70px -12px ${accent}`,
              }}
            >
              {countdown !== null ? "جاري البدء…" : startLabel}
              <Sparkles className="size-6" />
            </Button>
            <button
              type="button"
              onClick={onBackToSetup}
              disabled={countdown !== null}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40 sm:text-base"
            >
              <ArrowRight className="size-4" />
              رجوع للإعدادات
            </button>
          </div>
        </div>
      </div>

      {countdown !== null ? (
        <GameCountdownOverlay value={countdown} accent={accent} glow={glow} />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PlayingStage({
  accent,
  glow,
  title,
  moment,
  onDismissMoment,
  onBackToSetup,
  children,
}: {
  accent: string;
  glow: string;
  title: string;
  moment?: GameMoment | null;
  onDismissMoment?: () => void;
  onBackToSetup: () => void;
  children: ReactNode;
}) {
  return (
    <div className="game-page overflow-hidden animate-[stage-in_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-2">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold tracking-[0.18em] uppercase sm:text-base"
          style={{
            borderColor: `${accent}66`,
            background: `${accent}14`,
            color: glow,
          }}
        >
          <span className="size-2 animate-pulse rounded-full" style={{ background: accent }} />
          <span className="text-white/90">{title}</span>
          <span className="hidden sm:inline">· قيد اللعب</span>
        </span>

        <Button
          type="button"
          variant="ghost"
          onClick={onBackToSetup}
          className="h-10 gap-2 rounded-full px-5 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white sm:h-11 sm:text-base"
        >
          <RotateCcw className="size-4" />
          تعديل الإعدادات
        </Button>
      </div>

      <div className="game-play-arena">
        {children}
        {moment ? (
          <GameMomentOverlay
            moment={moment}
            accent={accent}
            glow={glow}
            onDismiss={() => onDismissMoment?.()}
          />
        ) : null}
      </div>
    </div>
  );
}
