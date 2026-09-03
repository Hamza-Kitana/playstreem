import { useEffect, useMemo, useState } from "react";
import { Brain, Clock, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import type { ChatMessage } from "@/hooks/useKickChat";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  QUESTION_COUNT_OPTIONS,
  clampQuestionCount,
  loadQuizPack,
  pickQuizSession,
  saveQuizPack,
  type QuizQuestion,
} from "@/lib/quiz-pack";
import { getQuizBank } from "@/lib/locale-banks";
import QuizOverlayStage from "@/components/games/QuizOverlayStage";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";

const ACCENT = "#8b5cf6";
const GLOW = "#c084fc";

export default function QuizGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, locale, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const g = messages.games.quiz;
  const c = messages.common;
  const quizBank = useMemo(() => getQuizBank(locale), [locale]);

  const pack = loadQuizPack();
  const [phase, setPhase] = useState<Phase>("setup");
  const [customs, setCustoms] = useState<QuizQuestion[]>([]);
  const [questionCount, setQuestionCount] = useState(() => clampQuestionCount(pack.questionCount || 10));
  const [durationSec, setDurationSec] = useState(pack.durationSec);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);

  useEffect(() => {
    saveQuizPack({
      ...loadQuizPack(),
      durationSec,
      questionCount,
      questions: loadQuizPack().questions,
      index: loadQuizPack().index,
    });
  }, [durationSec, questionCount]);

  const bankPlusCustom = [...quizBank, ...customs];
  const totalLibrary = quizBank.length + customs.length;

  const addQuestion = () => {
    if (!draftQ.trim() || !draftA.trim()) return;
    setCustoms((l) => [...l, { q: draftQ.trim(), a: draftA.trim() }]);
    setDraftQ("");
    setDraftA("");
  };

  const removeCustom = (i: number) => {
    setCustoms((l) => l.filter((_, k) => k !== i));
  };

  const startQuiz = () => {
    const deck = pickQuizSession(questionCount, bankPlusCustom);
    saveQuizPack({
      questions: deck,
      durationSec,
      questionCount,
      index: 0,
    });
    setStreamOpen(true);
    setPhase("playing");
  };

  const backToSetup = () => {
    setStreamOpen(false);
    setPhase("setup");
  };

  const durationLabel =
    durationOptions.find((o) => o.value === durationSec)?.label ?? `${durationSec}s`;

  return (
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Brain />}
        title={g.title}
        description={g.desc}
        chatActive={chatActive}
        canStart={questionCount >= 10}
        setupCtaLabel={questionCount >= 10 ? g.setupCta : g.questionCount}
        startLabel={g.start}
        onGoReady={() => {
          if (questionCount >= 10) setPhase("ready");
        }}
        onStart={startQuiz}
        skipCountdown
        onBackToSetup={backToSetup}
        settings={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={g.questionCount}
                icon={<ListChecks className="size-4" />}
                accent={ACCENT}
                value={String(questionCount)}
                onChange={(v) => setQuestionCount(clampQuestionCount(Number(v)))}
                options={QUESTION_COUNT_OPTIONS.map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
              />
              <SelectField
                label={g.questionDuration}
                icon={<Clock className="size-4" />}
                accent={ACCENT}
                value={String(durationSec)}
                onChange={(v) => setDurationSec(Number(v))}
                options={durationOptions.map((o) => ({
                  value: String(o.value),
                  label: o.label,
                }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <StatBadge
                icon={<ListChecks className="size-4" />}
                label={c.round}
                value={String(questionCount)}
                accent={ACCENT}
                glow={GLOW}
              />
              <StatBadge
                icon={<Clock className="size-4" />}
                label={g.questionDuration}
                value={durationLabel}
                accent={ACCENT}
                glow={GLOW}
              />
              <StatBadge
                icon={<Sparkles className="size-4" />}
                label={c.library}
                value={String(totalLibrary)}
                accent={ACCENT}
                glow={GLOW}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-white">{g.extraQuestions}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {customs.length > 0
                      ? `${customs.length} ${g.extraCount}`
                      : g.addCustomHint}
                  </p>
                </div>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl border-white/15 bg-white/[0.03] font-bold hover:bg-white/[0.08]"
                    >
                      <Plus className="size-4" /> {g.add}
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="max-w-lg border-border/60 bg-background sm:rounded-3xl"
                    dir={dir}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-xl font-extrabold">{g.customTitle}</DialogTitle>
                      <DialogDescription>
                        {c.library} {quizBank.length}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <Input
                        value={draftQ}
                        onChange={(e) => setDraftQ(e.target.value)}
                        placeholder={g.questionPlaceholder}
                        className="h-11 rounded-xl"
                      />
                      <Input
                        value={draftA}
                        onChange={(e) => setDraftA(e.target.value)}
                        placeholder={g.answerPlaceholder}
                        className="h-11 rounded-xl"
                      />
                      <Button
                        className="w-full rounded-xl font-extrabold"
                        onClick={addQuestion}
                        disabled={!draftQ.trim() || !draftA.trim()}
                      >
                        <Plus className="size-4" /> {g.add}
                      </Button>
                      <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border/50 bg-secondary/30 p-3">
                        {customs.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground">
                            {g.noExtraQuestions}
                          </p>
                        ) : (
                          customs.map((item, i) => (
                            <div
                              key={`${item.q}-${i}`}
                              className="flex items-start justify-between gap-2 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="font-bold">
                                  <span className="ml-1 text-primary">{i + 1}.</span>
                                  {item.q}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {g.answerLabel} {item.a}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive"
                                onClick={() => removeCustom(i)}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <DialogFooter className="sm:justify-start">
                      <Button
                        variant="secondary"
                        className="rounded-xl font-bold"
                        onClick={() => setAddOpen(false)}
                      >
                        {g.done}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        }
        setupExtras={
          <ul className="space-y-1.5 text-[13px] leading-6 text-white/60">
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
              {g.ruleFirst}
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: GLOW }} />
              {g.ruleReveal}
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
              {g.ruleFinal}
            </li>
          </ul>
        }
        play={
          <div className="game-play-shell">
            {streamOpen ? (
              <QuizOverlayStage messages={chatMessages} chatActive={chatActive} variant="page" />
            ) : (
              <div
                className="flex flex-1 items-center justify-center rounded-[1.25rem] border px-6 py-10 text-center"
                style={{
                  borderColor: `${ACCENT}55`,
                  background: `${ACCENT}0d`,
                }}
              >
                <p className="text-sm text-white/60">{c.sessionStopped}</p>
                <Button
                  className="mt-4 h-12 rounded-2xl px-6 font-extrabold text-white hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                  onClick={startQuiz}
                  disabled={!chatActive}
                >
                  {c.resume}
                </Button>
              </div>
            )}
          </div>
        }
      />
    </>
  );
}

function StatBadge({
  icon,
  label,
  value,
  accent,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  glow: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-3 text-center backdrop-blur"
      style={{
        borderColor: `${accent}40`,
        background: `linear-gradient(135deg, ${accent}18, transparent 70%)`,
      }}
    >
      <span
        className="mx-auto grid size-8 place-items-center rounded-xl"
        style={{ background: `${accent}22`, color: glow }}
      >
        {icon}
      </span>
      <p className="mt-1 text-lg font-black leading-none" style={{ color: glow }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-extrabold tracking-wider text-white/50 uppercase">
        {label}
      </p>
    </div>
  );
}
