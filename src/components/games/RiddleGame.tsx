import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Crown,
  Eye,
  EyeOff,
  Lightbulb,
  ListChecks,
  Puzzle,
  RotateCcw,
  Square,
  Trophy,
} from "lucide-react";
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
import { pickRiddleRound, riddleMatches, RIDDLE_BANK, RIDDLE_COUNTS, type Riddle } from "@/lib/riddles";
import { cn } from "@/lib/utils";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";

const ACCENT = "#fb923c";
const GLOW = "#fdba74";

type Winner = { user: string; answer: string; color: string };

export default function RiddleGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [roundCount, setRoundCount] = useState<(typeof RIDDLE_COUNTS)[number]>(10);
  const [deck, setDeck] = useState<Riddle[]>(() => pickRiddleRound(RIDDLE_BANK, 10));
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<Winner | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const [peekAnswer, setPeekAnswer] = useState(false);
  const session = useGameSession(120);
  const settled = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  const urgent = session.left != null && session.left <= 15;

  useEffect(() => {
    setHintOn(false);
    setPeekAnswer(false);
  }, [current?.id]);

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(messages, session.running && !finished, (m) => {
    if (!current || settled.current) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    setAttempts((n) => n + 1);
    if (!riddleMatches(m.text, current, normalizeAr)) return;
    const who = participantKey(m);
    if (!who) return;
    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    setWinnerOpen(true);
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    setScoreColors((c) => ({ ...c, [m.user]: m.color }));
    session.stop();
  });

  const showFinal = () => {
    session.stop();
    setFinished(true);
    setWinnerOpen(false);
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
    setWinnerOpen(false);
    setAttempts(0);
    session.clearParticipants();
    if (resume) window.setTimeout(() => session.start(), 0);
  };

  const start = () => {
    if (!current || finished) return;
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.start();
    setPhase("playing");
  };

  const restartAll = () => {
    session.stop();
    setDeck(pickRiddleRound(RIDDLE_BANK, roundCount));
    setIndex(0);
    setScores({});
    setScoreColors({});
    setWinner(null);
    setWinnerOpen(false);
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
        icon={<Puzzle />}
        title="ألغاز صعبة"
        description="ألغاز تحتاج تفكير — الحل ما يظهر على الشاشة. الجمهور يخمن بالشات وأول جواب صحيح يفوز بالنقطة."
        chatActive={chatActive}
        canStart={Boolean(current)}
        setupCtaLabel="التالي · جهّز اللعبة"
        startLabel="ابدأ الجولة"
        onGoReady={() => setPhase("ready")}
        onStart={start}
        onBackToSetup={() => {
          session.stop();
          setPhase("setup");
        }}
        settings={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="عدد الألغاز"
                icon={<ListChecks className="size-4" />}
                accent={ACCENT}
                value={String(roundCount)}
                onChange={(v) => {
                  const n = Number(v) as (typeof RIDDLE_COUNTS)[number];
                  setRoundCount(n);
                  setDeck(pickRiddleRound(RIDDLE_BANK, n));
                  setIndex(0);
                  setScores({});
                  setScoreColors({});
                  setWinner(null);
                  setAttempts(0);
                  setFinished(false);
                  setFinalOpen(false);
                  settled.current = false;
                }}
                options={RIDDLE_COUNTS.map((n) => ({ value: String(n), label: `${n} لغز` }))}
              />
              <SelectField
                label="مدة اللغز"
                icon={<Clock className="size-4" />}
                accent={ACCENT}
                value={String(session.durationSec)}
                onChange={(v) => session.setDurationSec(Number(v))}
                options={DURATION_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <StatBadge label="مكتبة" value={String(RIDDLE_BANK.length)} accent={ACCENT} glow={GLOW} />
              <StatBadge label="الجولة" value={String(roundCount)} accent={ACCENT} glow={GLOW} />
              <StatBadge
                label="المدة"
                value={
                  DURATION_OPTIONS.find((o) => o.value === session.durationSec)?.label ??
                  `${session.durationSec} ث`
                }
                accent={ACCENT}
                glow={GLOW}
              />
            </div>
          </div>
        }
        play={
          <div className="game-play-shell">
            {/* Top control bar */}
            <div className="game-toolbar glass flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-3 sm:p-4"
              style={{ borderColor: `${ACCENT}44` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid size-11 place-items-center rounded-2xl sm:size-12"
                  style={{ background: `${ACCENT}22`, color: ACCENT }}
                >
                  <Puzzle className="size-5 sm:size-6" />
                </span>
                <div>
                  <p className="text-base font-extrabold text-white sm:text-lg">
                    {finished ? "انتهت الجولة" : `لغز ${index + 1} من ${deck.length}`}
                  </p>
                  <p className="text-sm text-white/55 sm:text-base">
                    {finished ? "شوف النتيجة النهائية" : `${current?.category ?? "غير محدد"}`}
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
                  onClick={() => session.stop()}
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
                <p className="mt-2 text-sm text-white/60">خلّصنا الـ {deck.length} ألغاز</p>
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
                  <Button variant="outline" className="h-12 rounded-2xl border-white/15 bg-white/[0.03] px-5 font-bold" onClick={restartAll}>
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
                    background: `linear-gradient(180deg, oklch(0.14 0.05 40 / 0.75), oklch(0.09 0.03 285 / 0.9))`,
                  }}
                >
                  <div
                    className={cn(
                      "shrink-0 border-b border-white/10 px-4 py-3 text-center sm:py-4",
                      session.running ? (urgent ? "bg-destructive/15" : "") : "",
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
                        ? `تخمينات ${attempts}`
                        : "اضغط استئناف للجولة"}
                    </p>
                  </div>

                  <div className="relative flex min-h-0 flex-1 flex-col justify-center px-4 py-4 sm:px-8 sm:py-6">
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(70% 60% at 50% 20%, ${ACCENT}12, transparent 70%)`,
                      }}
                    />
                    <div
                      className="relative mx-auto w-full max-w-none rounded-[1.5rem] border p-5 sm:p-8"
                      style={{
                        borderColor: session.running ? `${ACCENT}66` : "rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <p
                        className="text-center text-xs font-extrabold tracking-[0.35em] uppercase sm:text-sm"
                        style={{ color: GLOW }}
                      >
                        {current?.category}
                      </p>
                      <div
                        className="mx-auto mt-4 mb-6 h-px w-24"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                        }}
                      />
                      <div className="space-y-3 text-center">
                        {current?.lines.map((line) => (
                          <p
                            key={line}
                            className="text-xl leading-relaxed font-extrabold text-white sm:text-3xl lg:text-4xl"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                      {hintOn && current ? (
                        <p
                          className="mt-6 rounded-2xl border px-4 py-3 text-center text-sm font-bold"
                          style={{
                            borderColor: `${ACCENT}30`,
                            background: `${ACCENT}15`,
                            color: GLOW,
                          }}
                        >
                          تلميح: {current.hint}
                        </p>
                      ) : null}
                      {peekAnswer && current ? (
                        <p className="mt-3 text-center text-xs font-bold text-white/60">
                          الحل (لك أنت):{" "}
                          <span style={{ color: GLOW }}>{current.answer}</span>
                        </p>
                      ) : null}
                    </div>

                    <p className="relative mt-6 text-center text-sm font-bold text-white/55">
                      اكتبوا الحل في الشات — أول إصابة تفوز
                    </p>

                    <div className="relative mt-5 flex flex-wrap justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-xl font-bold"
                        onClick={() => setHintOn((v) => !v)}
                        disabled={!current}
                      >
                        <Lightbulb className="size-3.5" />
                        {hintOn ? "إخفاء التلميح" : "تلميح"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-white/15 bg-white/[0.03] font-bold"
                        onClick={() => setPeekAnswer((v) => !v)}
                        disabled={!current}
                      >
                        {peekAnswer ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {peekAnswer ? "خبّئ الحل" : "الحل (ستريمر)"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-xl font-bold"
                        onClick={() => goNext(false)}
                        disabled={finished}
                      >
                        <RotateCcw className="size-3.5" />
                        {hasNext
                          ? session.running
                            ? "التالي (إعادة العداد)"
                            : "التالي"
                          : "إنهاء"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Leaderboard sidebar */}
                <aside className="glass flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 p-4">
                  <div className="mb-3 flex shrink-0 items-center gap-2">
                    <Trophy className="size-5" style={{ color: GLOW }} />
                    <p className="text-base font-extrabold text-white sm:text-lg">المتصدرين</p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
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
                            <span
                              className="truncate"
                              style={{ color: scoreColors[user] ?? "white" }}
                            >
                              {user}
                            </span>
                          </span>
                          <span
                            className="rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums"
                            style={{
                              color: GLOW,
                              background: `${ACCENT}22`,
                            }}
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

      <Dialog
        open={winnerOpen && Boolean(winner) && !finished}
        onOpenChange={(open) => {
          setWinnerOpen(open);
          if (!open) setWinner(null);
        }}
      >
        <DialogContent className="max-w-sm border-white/12 bg-[#0d0a1e] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div
              className="mx-auto grid size-14 place-items-center rounded-2xl"
              style={{ background: `${ACCENT}22`, color: GLOW }}
            >
              <Crown className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">فكّ اللغز!</DialogTitle>
            <DialogDescription>
              الحل:{" "}
              <span className="font-bold text-foreground">{current?.answer}</span>
            </DialogDescription>
          </DialogHeader>
          {winner ? (
            <p
              className="animate-pop-in font-brand py-2 text-center text-4xl font-bold"
              style={{ color: winner.color }}
            >
              {winner.user}
            </p>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {hasNext ? (
              <>
                <Button
                  className="w-full rounded-2xl font-extrabold text-white hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                  onClick={() => {
                    setWinnerOpen(false);
                    goNext(true);
                  }}
                >
                  اللغز التالي وابدأ
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-white/15 bg-white/[0.03] font-bold"
                  onClick={() => {
                    setWinnerOpen(false);
                    goNext(false);
                  }}
                >
                  اللغز التالي فقط
                </Button>
              </>
            ) : (
              <Button
                className="w-full rounded-2xl font-extrabold text-white hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                onClick={() => {
                  setWinnerOpen(false);
                  showFinal();
                }}
              >
                النتيجة النهائية
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogDescription>بعد {deck.length} ألغاز</DialogDescription>
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
                <div
                  key={user}
                  className="flex items-center justify-between text-sm font-bold"
                >
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

function StatBadge({
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
      <p className="mt-1 text-lg font-black leading-none" style={{ color: glow }}>
        {value}
      </p>
    </div>
  );
}
