import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, PlugZap, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
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
  /** Called when the user finishes the setup phase (moves to ready). */
  onGoReady: () => void;
  /** Called when the user hits start in the ready phase (moves to playing). */
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
  onGoReady,
  onStart,
  onBackToSetup,
  setupExtras,
}: GameStageProps) {
  return (
    <div className="w-full">
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
    <div className="mx-auto max-w-4xl animate-[stage-in_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 sm:p-9"
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

        <div className="relative">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-3xl text-white shadow-[0_20px_60px_-16px_rgba(0,0,0,0.6)]"
              style={{ background: `linear-gradient(135deg, ${accent}, ${glow})` }}
            >
              <span className="[&_svg]:size-8">{icon}</span>
            </span>
            <div className="min-w-0 flex-1">
              <span
                className="inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-[0.22em] uppercase"
                style={{
                  borderColor: `${accent}66`,
                  color: glow,
                  background: `${accent}18`,
                }}
              >
                الخطوة ١ · الإعدادات
              </span>
              <h3 className="font-brand mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-white/70 sm:text-base">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur">
            {settings}
          </div>

          {setupExtras ? <div className="mt-4">{setupExtras}</div> : null}

          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!chatActive ? (
              <Button
                asChild
                variant="ghost"
                className="h-12 gap-1.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 text-sm font-extrabold text-destructive hover:bg-destructive/15"
              >
                <Link to="/connect">
                  <PlugZap className="size-4" />
                  اربط الشات أول
                </Link>
              </Button>
            ) : (
              <p className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-white/50 uppercase">
                <Sparkles className="size-3.5" style={{ color: accent }} />
                جاهزين · بس اضغط التالي
              </p>
            )}

            <Button
              type="button"
              disabled={disabled}
              onClick={onGoReady}
              className={cn(
                "h-14 min-w-[16rem] gap-2 rounded-2xl px-6 text-lg font-extrabold text-white transition hover:brightness-110",
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
  useEffect(() => {
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 600);
    return () => window.clearTimeout(id);
  }, []);

  const disabled = !chatActive || !canStart;

  return (
    <div className="mx-auto max-w-3xl animate-[stage-in_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div
        className={cn(
          "relative overflow-hidden rounded-[2rem] border p-8 text-center sm:p-14",
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
            className="mx-auto grid size-20 place-items-center rounded-3xl text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${glow})`,
              boxShadow: `0 0 60px -10px ${accent}`,
            }}
          >
            <span className="[&_svg]:size-10">{icon}</span>
          </span>

          <p
            className="mt-5 text-[11px] font-extrabold tracking-[0.28em] uppercase"
            style={{ color: glow }}
          >
            الخطوة ٢ · جاهز؟
          </p>
          <h2 className="font-brand mt-2 text-3xl font-bold sm:text-4xl">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, ${accent}, white 55%, ${glow})`,
              }}
            >
              {title}
            </span>
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
            الإعدادات محفوظة. لما تكون جاهز، اضغط الزر تحت وابدأ اللعبة مباشرة.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              type="button"
              disabled={disabled}
              onClick={onStart}
              className="h-16 min-w-[18rem] gap-2 rounded-3xl px-8 text-xl font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${glow})`,
                boxShadow: `0 25px 70px -12px ${accent}`,
              }}
            >
              {startLabel}
              <Sparkles className="size-5" />
            </Button>
            <button
              type="button"
              onClick={onBackToSetup}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="size-3.5" />
              رجوع للإعدادات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PlayingStage({
  accent,
  glow,
  title,
  onBackToSetup,
  children,
}: {
  accent: string;
  glow: string;
  title: string;
  onBackToSetup: () => void;
  children: ReactNode;
}) {
  return (
    <div className="w-full animate-[stage-in_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.22em] uppercase"
          style={{
            borderColor: `${accent}66`,
            background: `${accent}14`,
            color: glow,
          }}
        >
          <span className="size-1.5 animate-pulse rounded-full" style={{ background: accent }} />
          <span className="text-white/80">{title}</span>
          <span className="hidden sm:inline">· قيد اللعب</span>
        </span>

        <Button
          type="button"
          variant="ghost"
          onClick={onBackToSetup}
          className="h-9 gap-1.5 rounded-full px-4 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="size-3.5" />
          تعديل الإعدادات
        </Button>
      </div>

      {children}
    </div>
  );
}
