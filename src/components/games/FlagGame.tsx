import { useEffect, useRef, useState } from "react";
import { Clock, Flag, Globe2, RotateCcw, Square, Trophy } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FLAG_BANK, flagImageUrl, shuffleFlags, type FlagItem } from "@/lib/flags";
import type { GameMoment } from "@/lib/game-moments";
import { loseMoment, stoppedMoment, winMoment } from "@/lib/game-moments";
import { cn } from "@/lib/utils";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";

const ACCENT = "#f472b6";
const GLOW = "#f9a8d4";

type Winner = { user: string; answer: string; color: string };

function answersMatch(guess: string, flag: FlagItem) {
  if (!guess) return false;
  const keys = [flag.name, ...(flag.aliases ?? [])].map((x) => normalizeAr(x)).filter(Boolean);
  return keys.some((key) => {
    if (!key) return false;
    if (guess === key) return true;
    if (key.length >= 3 && guess.includes(key)) return true;
    if (guess.length >= 3 && key.includes(guess)) return true;
    return false;
  });
}

export default function FlagGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [deck, setDeck] = useState<FlagItem[]>(() => shuffleFlags(FLAG_BANK));
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<Winner | null>(null);
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [imgOk, setImgOk] = useState(true);
  const session = useGameSession(45);
  const settled = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  const hasNextRef = useRef(hasNext);
  hasNextRef.current = hasNext;
  const urgent = session.left != null && session.left <= 10;

  useEffect(() => {
    session.setOnExpire(() => {
      if (!settled.current) {
        setMoment(loseMoment("انتهى الوقت بدون إجابة صحيحة."));
      }
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire]);

  useEffect(() => {
    setImgOk(true);
  }, [current?.code]);

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(messages, session.running && !finished, (m) => {
    const who = participantKey(m);
    if (!current || settled.current || !who) return;
    if (session.hasParticipated(who)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(who)) return;
    setAttempts((n) => n + 1);
    if (!answersMatch(text, current)) return;
    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    setScoreColors((c) => ({ ...c, [m.user]: m.color }));
    session.stop();
    setMoment({
      ...winMoment(m.user, m.color, `الدولة: ${current.name}`),
      actionLabel: hasNextRef.current ? "العلم التالي" : "النتيجة النهائية",
      onAction: () => goNext(true),
    });
  });

  const showFinal = () => {
    session.stop();
    setFinished(true);
    setMoment(null);
    setWinner(null);
    setFinalOpen(true);
  };

  const goNext = (andStart: boolean) => {
    if (!hasNext) {
      showFinal();
      return;
    }
    const resume = andStart || session.running;
    session.stop();
    setIndex((i) => i + 1);
    settled.current = false;
    setWinner(null);
    setMoment(null);
    setAttempts(0);
    session.clearParticipants();
    if (resume) window.setTimeout(() => session.start(), 0);
  };

  const start = () => {
    if (!current || finished) return;
    settled.current = false;
    setWinner(null);
    setMoment(null);
    setAttempts(0);
    session.start();
    setPhase("playing");
  };

  const restartAll = () => {
    session.stop();
    setDeck(shuffleFlags(FLAG_BANK));
    setIndex(0);
    setScores({});
    setScoreColors({});
    setWinner(null);
    setMoment(null);
    setFinished(false);
    setFinalOpen(false);
    setAttempts(0);
    settled.current = false;
    setPhase("setup");
  };

  const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranking.slice(0, 6);
  const champion = ranking[0];

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(session.durationSec > 0 ? session.durationSec : 0);

  return (
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Flag />}
        title="اعرف العلم"
        description={`شاشة تعرض العلم — الجمهور يكتب اسم الدولة في الشات. أول جواب صحيح يفوز. فيه ${FLAG_BANK.length} علم بدون تكرار.`}
        chatActive={chatActive}
        canStart={Boolean(current)}
        setupCtaLabel="التالي · جهّز اللعبة"
        startLabel="ابدأ الجولة"
        onGoReady={() => setPhase("ready")}
        onStart={start}
        onBackToSetup={() => {
          session.stop();
          setMoment(null);
          setPhase("setup");
        }}
        moment={moment}
        onDismissMoment={() => setMoment(null)}
        settings={
          <div className="space-y-4">
            <SelectField
              label="مدة الجولة"
              icon={<Clock className="size-4" />}
              accent={ACCENT}
              value={String(session.durationSec)}
              onChange={(v) => session.setDurationSec(Number(v))}
              options={DURATION_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStat label="أعلام" value={String(FLAG_BANK.length)} accent={ACCENT} glow={GLOW} />
              <MiniStat
                label="المدة"
                value={
                  DURATION_OPTIONS.find((o) => o.value === session.durationSec)?.label ??
                  `${session.durationSec} ث`
                }
                accent={ACCENT}
                glow={GLOW}
              />
              <MiniStat label="نمط" value="بلا تكرار" accent={ACCENT} glow={GLOW} />
            </div>
          </div>
        }
        play={
          <div className="game-play-shell">
            <div
              className="game-toolbar glass flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-3 sm:p-4"
              style={{ borderColor: `${ACCENT}44` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid size-11 place-items-center rounded-2xl sm:size-12"
                  style={{ background: `${ACCENT}22`, color: ACCENT }}
                >
                  <Globe2 className="size-5 sm:size-6" />
                </span>
                <div>
                  <p className="text-base font-extrabold text-white sm:text-lg">
                    {finished ? "انتهت الجولة" : `علم ${index + 1} من ${deck.length}`}
                    {current?.hard ? " · صعب" : ""}
                  </p>
                  <p className="text-sm text-white/55 sm:text-base">
                    {finished ? "شوف النتيجة النهائية" : "الجمهور يكتب اسم الدولة"}
                  </p>
                </div>
              </div>

              {finished ? (
                <Button
                  className="h-11 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                  onClick={restartAll}
                >
                  <RotateCcw className="size-4" /> جولة جديدة
                </Button>
              ) : session.running ? (
                <Button
                  variant="destructive"
                  className="h-11 gap-1.5 rounded-2xl font-extrabold"
                  onClick={() => {
                    session.stop();
                    setMoment(stoppedMoment("أوقفت الجولة يدوياً."));
                  }}
                >
                  <Square className="size-4" /> إيقاف
                </Button>
              ) : (
                <Button
                  className="h-11 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                  disabled={!chatActive || !current}
                  onClick={start}
                >
                  <RotateCcw className="size-4" /> استئناف
                </Button>
              )}
            </div>

            {finished ? (
              <div
                className="rounded-[1.75rem] border p-8 text-center sm:p-14"
                style={{
                  borderColor: `${ACCENT}55`,
                  background: `radial-gradient(70% 60% at 50% 0%, ${ACCENT}25, transparent 65%), oklch(0.10 0.03 285 / 0.95)`,
                }}
              >
                <Trophy className="mx-auto size-16" style={{ color: GLOW }} />
                <h2 className="font-brand mt-4 text-4xl font-bold text-white sm:text-5xl">انتهت الجولة</h2>
                <p className="mt-2 text-sm text-white/60">خلّصنا الـ {deck.length} علم</p>
                {champion ? (
                  <p
                    className="font-brand mt-8 text-5xl font-bold"
                    style={{ color: scoreColors[champion[0]] }}
                  >
                    {champion[0]}
                    <span className="ms-3 text-2xl" style={{ color: GLOW }}>
                      ({champion[1]})
                    </span>
                  </p>
                ) : (
                  <p className="mt-8 text-sm text-white/50">ما في نقاط.</p>
                )}
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  <Button
                    className="h-12 rounded-2xl px-6 font-extrabold text-white hover:brightness-110"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                    onClick={() => setFinalOpen(true)}
                  >
                    <Trophy className="size-4" /> النتيجة الكاملة
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl border-white/15 bg-white/[0.03] px-5 font-bold"
                    onClick={restartAll}
                  >
                    من جديد
                  </Button>
                </div>
              </div>
            ) : (
              <div className="game-play-grid lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div
                  className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border"
                  style={{
                    borderColor: `${ACCENT}44`,
                    background: "linear-gradient(180deg, oklch(0.14 0.05 340 / 0.75), oklch(0.09 0.03 285 / 0.9))",
                  }}
                >
                  <div
                    className={cn(
                      "shrink-0 border-b border-white/10 px-4 py-3 text-center sm:py-4",
                      session.running && urgent ? "bg-destructive/15" : "",
                    )}
                    style={
                      session.running && !urgent
                        ? { background: `linear-gradient(180deg, ${ACCENT}25, transparent)` }
                        : undefined
                    }
                  >
                    <p className="text-xs font-extrabold tracking-[0.28em] text-white/55 uppercase sm:text-sm">
                      العداد
                    </p>
                    <p
                      className={cn(
                        "font-brand mt-1 text-5xl font-bold tabular-nums sm:text-6xl",
                        session.running ? (urgent ? "text-destructive" : "") : "text-white/60",
                      )}
                      style={session.running && !urgent ? { color: GLOW } : undefined}
                    >
                      {clockLabel}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white/55 sm:text-base">
                      {session.running
                        ? `محاولات ${attempts} · مشاركون ${session.participantCount}`
                        : "اضغط استئناف عشان الجمهور يجيب"}
                    </p>
                  </div>

                  <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4 sm:px-8 sm:py-6">
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(60% 50% at 50% 30%, ${ACCENT}15, transparent 70%)`,
                      }}
                    />
                    <div
                      className="relative overflow-hidden rounded-3xl border bg-black/50 shadow-[0_28px_80px_-30px_black]"
                      style={{ borderColor: session.running ? `${ACCENT}66` : "rgba(255,255,255,0.10)" }}
                    >
                      {current && imgOk ? (
                        <img
                          src={flagImageUrl(current.code, 640)}
                          alt="علم الدولة"
                          className="block h-auto max-h-full w-full max-w-[min(100%,38rem)] object-contain"
                          onError={() => setImgOk(false)}
                          loading="eager"
                          decoding="async"
                        />
                      ) : (
                        <div className="grid h-56 w-[min(92vw,38rem)] place-items-center text-sm text-white/50">
                          تعذّر تحميل العلم
                        </div>
                      )}
                    </div>
                    <p className="relative mt-4 text-base font-bold text-white/65 sm:text-lg">
                      اكتبوا اسم الدولة في الشات
                    </p>
                    {!session.running ? (
                      <p className="relative mt-2 text-sm text-white/50">
                        الإجابة الصحيحة مخفية عن الشاشة — بس الشات يقدر يخمّن
                      </p>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="relative mt-6 rounded-xl font-bold"
                      onClick={() => goNext(false)}
                      disabled={finished}
                    >
                      <RotateCcw className="size-3.5" />
                      {hasNext
                        ? session.running
                          ? "العلم التالي (إعادة العداد)"
                          : "العلم التالي"
                        : "إنهاء وإظهار النتيجة"}
                    </Button>
                  </div>
                </div>

                <aside className="glass flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 p-4">
                  <div className="mb-3 flex shrink-0 items-center gap-2">
                    <Trophy className="size-5" style={{ color: GLOW }} />
                    <p className="text-base font-extrabold text-white sm:text-lg">المتصدرين</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                  {top.length === 0 ? (
                    <p className="rounded-xl bg-white/5 p-3 text-center text-sm text-white/55">
                      الفائزون يظهرون هنا
                    </p>
                  ) : (
                    <ol className="space-y-1.5">
                      {top.map(([user, pts], i) => (
                        <li
                          key={user}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-base"
                        >
                          <span className="flex min-w-0 items-center gap-2 font-bold">
                            <span
                              className={cn(
                                "grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-black",
                                i === 0 ? "text-black" : "text-white/80",
                              )}
                              style={{
                                background:
                                  i === 0
                                    ? `linear-gradient(135deg, ${GLOW}, ${ACCENT})`
                                    : "rgba(255,255,255,0.08)",
                              }}
                            >
                              {i + 1}
                            </span>
                            <span className="truncate" style={{ color: scoreColors[user] ?? "white" }}>
                              {user}
                            </span>
                          </span>
                          <span
                            className="rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums"
                            style={{ color: GLOW, background: `${ACCENT}22` }}
                          >
                            {pts}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                  </div>
                </aside>
              </div>
            )}
          </div>
        }
      />

      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent className="max-w-md border-white/12 bg-[#0d0a1e] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div
              className="mx-auto grid size-14 place-items-center rounded-2xl"
              style={{ background: `${ACCENT}22`, color: GLOW }}
            >
              <Trophy className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">النتيجة النهائية</DialogTitle>
            <DialogDescription>بعد {deck.length} علم</DialogDescription>
          </DialogHeader>
          {champion ? (
            <p
              className="font-brand text-center text-4xl font-bold"
              style={{ color: scoreColors[champion[0]] }}
            >
              {champion[0]}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">ما انحسبت نقاط.</p>
          )}
          {ranking.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
              {ranking.map(([user, pts], i) => (
                <div key={user} className="flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <span style={i === 0 ? { color: GLOW } : { color: "rgba(255,255,255,0.5)" }}>
                      {i + 1}
                    </span>
                    <span style={{ color: scoreColors[user] }}>{user}</span>
                  </span>
                  <span className="tabular-nums" style={{ color: GLOW }}>
                    {pts}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              className="w-full rounded-2xl font-extrabold text-white hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
              onClick={() => setFinalOpen(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MiniStat({
  label,
  value,
  accent,
  glow,
}: {
  label: string;
  value: string;
  accent: string;
  glow: string;
}) {
  return (
    <div
      className="rounded-2xl border p-3 text-center"
      style={{
        borderColor: `${accent}44`,
        background: `linear-gradient(135deg, ${accent}18, transparent 70%)`,
      }}
    >
      <p className="text-[10px] font-extrabold tracking-wider text-white/55 uppercase">{label}</p>
      <p className="mt-1 text-sm font-black leading-tight" style={{ color: glow }}>
        {value}
      </p>
    </div>
  );
}
