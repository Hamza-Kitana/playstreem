import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, Plus, Square, Trash2 } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import type { GameMoment } from "@/lib/game-moments";
import { stoppedMoment, timeoutMoment } from "@/lib/game-moments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";

const ACCENT = "#22d3ee";
const GLOW = "#67e8f9";

/** Map a chat line to an option index: numbers (1/٢) or option text (نعم / لا…). */
function resolveVoteIndex(raw: string, options: string[]): number {
  const t = normalizeAr(raw);
  if (!t || options.length === 0) return -1;

  const tokens = t.split(" ").filter(Boolean);
  const first = tokens[0] ?? "";
  const n = Number(first);
  if (Number.isInteger(n) && n >= 1 && n <= options.length) return n - 1;

  const normalized = options.map((o) => normalizeAr(o));

  const exact = normalized.findIndex((o) => o && o === t);
  if (exact >= 0) return exact;

  const ranked = normalized
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.length > 0)
    .sort((a, b) => b.o.length - a.o.length);

  for (const { o, i } of ranked) {
    if (first === o) return i;
    if (t.startsWith(`${o} `) || t.endsWith(` ${o}`)) return i;
  }

  return -1;
}

export default function PollGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [options, setOptions] = useState<string[]>(["نعم", "لا", "ما بعرف"]);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("هل نكمل التحدي؟");
  const [votes, setVotes] = useState<number[]>([0, 0, 0]);
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const session = useGameSession(60);

  useEffect(() => {
    session.setOnExpire(() => {
      setMoment(timeoutMoment("انتهى وقت التصويت — النتائج ظاهرة على الشاشة."));
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire]);

  useNewMessages(messages, session.running, (m) => {
    const who = participantKey(m);
    if (!who) return;
    if (session.hasParticipated(who)) return;
    const idx = resolveVoteIndex(m.text, options);
    if (idx < 0) return;
    if (!session.tryClaim(who)) return;
    setVotes((v) => v.map((c, i) => (i === idx ? c + 1 : c)));
  });

  const total = votes.reduce((a, b) => a + b, 0);
  const leader = useMemo(() => (total ? votes.indexOf(Math.max(...votes)) : -1), [votes, total]);
  const urgent = session.left != null && session.left <= 10;

  const start = () => {
    setMoment(null);
    setVotes(options.map(() => 0));
    session.start();
    setPhase("playing");
  };

  const backToSetup = () => {
    session.stop();
    setMoment(null);
    setPhase("setup");
  };

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(session.durationSec > 0 ? session.durationSec : 0);

  return (
    <GameStage
      phase={phase}
      accent={ACCENT}
      glow={GLOW}
      icon={<BarChart3 />}
      title="التصويت"
      description="اطرح سؤال وخيارات — الجمهور يصوّت من الشات بالرقم أو نص الخيار. صوت واحد لكل مشاهد."
      chatActive={chatActive}
      canStart={options.length >= 2 && question.trim().length > 0}
      setupCtaLabel="التالي · جهّز اللعبة"
      startLabel="ابدأ التصويت"
      onGoReady={() => setPhase("ready")}
      onStart={start}
      onBackToSetup={backToSetup}
      moment={moment}
      onDismissMoment={() => setMoment(null)}
      settings={
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="مدة التصويت"
              icon={<Clock className="size-4" />}
              accent={ACCENT}
              value={String(session.durationSec)}
              onChange={(v) => session.setDurationSec(Number(v))}
              options={DURATION_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-white/60 uppercase">
                <BarChart3 className="size-3.5" style={{ color: ACCENT }} />
                السؤال
              </span>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="h-12 rounded-2xl border-white/12 bg-black/30 text-base font-bold"
                placeholder="سؤال التصويت"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-[11px] font-extrabold tracking-wider text-white/60 uppercase">
              الخيارات ({options.length})
            </p>
            <ul className="space-y-2">
              {options.map((opt, i) => (
                <li
                  key={`${opt}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span
                    className="grid size-8 place-items-center rounded-lg text-sm font-black"
                    style={{ background: `${ACCENT}22`, color: GLOW }}
                  >
                    {i + 1}
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptions((o) => o.map((x, k) => (k === i ? val : x)));
                    }}
                    className="h-9 flex-1 rounded-lg border-white/10 bg-black/25 text-sm font-bold"
                  />
                  <button
                    type="button"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-destructive/15 hover:text-destructive"
                    onClick={() => {
                      setOptions((l) => l.filter((_, k) => k !== i));
                      setVotes((v) => v.filter((_, k) => k !== i));
                    }}
                    disabled={options.length <= 2}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="أضف خياراً جديداً…"
                className="h-10 flex-1 rounded-xl border-white/10 bg-black/25"
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || !draft.trim()) return;
                  setOptions((o) => [...o, draft.trim()]);
                  setVotes((v) => [...v, 0]);
                  setDraft("");
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-white/12 bg-white/[0.03] font-bold"
                onClick={() => {
                  if (!draft.trim()) return;
                  setOptions((o) => [...o, draft.trim()]);
                  setVotes((v) => [...v, 0]);
                  setDraft("");
                }}
              >
                <Plus className="size-4" /> إضافة
              </Button>
            </div>
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
                <BarChart3 className="size-5 sm:size-6" />
              </span>
              <div>
                <p className="text-base font-extrabold text-white sm:text-lg">
                  {session.running ? "تصويت شغّال" : "تصويت متوقّف"}
                </p>
                <p className="text-sm text-white/55 sm:text-base">
                  {session.running
                    ? `${total} صوت · ${clockLabel} متبقّي`
                    : `${total} صوت مسجّل`}
                </p>
              </div>
            </div>

            {session.running ? (
              <Button
                variant="destructive"
                className="h-11 gap-1.5 rounded-2xl font-extrabold"
                onClick={() => {
                  session.stop();
                  setMoment(stoppedMoment("أوقفت التصويت — النتائج محفوظة."));
                }}
              >
                <Square className="size-4" /> إيقاف
              </Button>
            ) : (
              <Button
                className="h-11 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                onClick={start}
                disabled={!chatActive}
              >
                استئناف
              </Button>
            )}
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border p-4 sm:p-6"
            style={{
              borderColor: `${ACCENT}44`,
              background: `linear-gradient(180deg, oklch(0.14 0.05 220 / 0.85), oklch(0.09 0.03 285 / 0.95))`,
            }}
          >
            <div className="mb-3 shrink-0 text-center sm:mb-4">
              <p
                className="text-xs font-extrabold tracking-[0.28em] uppercase sm:text-sm"
                style={{ color: GLOW }}
              >
                السؤال
              </p>
              <h3 className="font-brand mt-2 text-2xl font-bold text-white sm:text-4xl">
                {question}
              </h3>
              <p
                className="font-brand mt-2 text-4xl font-bold tabular-nums sm:text-5xl"
                style={session.running && !urgent ? { color: GLOW } : session.running && urgent ? { color: "var(--destructive)" } : { color: "rgba(255,255,255,0.55)" }}
              >
                {clockLabel}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-hidden sm:gap-2.5">
              {options.map((opt, i) => {
                const pct = total ? Math.round((votes[i]! / total) * 100) : 0;
                const isLeader = leader === i && total > 0;
                return (
                  <div
                    key={`${opt}-${i}`}
                    className="relative overflow-hidden rounded-2xl border p-3.5 transition sm:p-4"
                    style={{
                      borderColor: isLeader ? `${ACCENT}88` : "rgba(255,255,255,0.10)",
                      background: isLeader ? `${ACCENT}12` : "rgba(0,0,0,0.35)",
                      boxShadow: isLeader ? `0 15px 40px -20px ${ACCENT}` : "none",
                    }}
                  >
                    <div
                      className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to left, ${ACCENT}44, ${GLOW}22)`,
                      }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3 text-base font-bold text-white sm:text-lg">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-base font-black sm:size-10"
                          style={{
                            background: isLeader
                              ? `linear-gradient(135deg, ${ACCENT}, ${GLOW})`
                              : "rgba(0,0,0,0.4)",
                            color: isLeader ? "black" : GLOW,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="truncate">{opt}</span>
                      </span>
                      <span className="shrink-0 text-xl font-extrabold tabular-nums text-white sm:text-2xl">
                        {pct}%
                        <span className="ms-1 text-sm text-white/50">({votes[i]})</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-center text-sm font-bold text-white/60">
              المشاهد يكتب <span className="text-white">نص الخيار</span> أو{" "}
              <span className="text-white">رقمه</span> في الشات · مجموع الأصوات:{" "}
              <span className="tabular-nums text-white">{total}</span>
            </p>
          </div>
        </div>
      }
    />
  );
}
