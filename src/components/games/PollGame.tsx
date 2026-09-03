import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, Pencil, Plus, Square, Trash2 } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { useGameMoments } from "@/hooks/useGameMoments";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import type { GameMoment } from "@/lib/game-moments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const { timeoutMoment, stoppedMoment } = useGameMoments();
  const g = messages.games.poll;
  const c = messages.common;

  const [phase, setPhase] = useState<Phase>("setup");
  const [options, setOptions] = useState<string[]>([c.yes, c.no, c.dontKnow]);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState(c.defaultPollQ);
  const [votes, setVotes] = useState<number[]>([0, 0, 0]);
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState(c.defaultPollQ);
  const [editOptions, setEditOptions] = useState<string[]>([c.yes, c.no, c.dontKnow]);
  const [editDraft, setEditDraft] = useState("");
  const session = useGameSession(60);

  useEffect(() => {
    session.setOnExpire(() => {
      setMoment(timeoutMoment(c.voteTimeout));
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire, timeoutMoment, c.voteTimeout]);

  useNewMessages(chatMessages, session.running, (m) => {
    const who = participantKey(m);
    if (!who) return;
    if (session.hasParticipated(who)) return;
    const idx = resolveVoteIndex(m.text, options);
    if (idx < 0) return;
    if (!session.tryClaim(who)) return;
    setVotes((v) => v.map((count, i) => (i === idx ? count + 1 : count)));
  });

  const total = votes.reduce((a, b) => a + b, 0);
  const leader = useMemo(() => (total ? votes.indexOf(Math.max(...votes)) : -1), [votes, total]);
  const urgent = session.left != null && session.left <= 10;

  const openEditor = () => {
    setEditQuestion(question);
    setEditOptions([...options]);
    setEditDraft("");
    setEditOpen(true);
  };

  const saveEditor = () => {
    const cleaned = editOptions.map((o) => o.trim()).filter(Boolean);
    if (cleaned.length < 2 || !editQuestion.trim()) return;
    setQuestion(editQuestion.trim());
    setOptions(cleaned);
    setVotes(cleaned.map(() => 0));
    setEditOpen(false);
  };

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
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<BarChart3 />}
        title={g.title}
        description={g.desc}
        chatActive={chatActive}
        canStart={options.length >= 2 && question.trim().length > 0}
        setupCtaLabel={g.setupCta}
        startLabel={g.start}
        onGoReady={() => setPhase("ready")}
        onStart={start}
        onBackToSetup={backToSetup}
        moment={moment}
        onDismissMoment={() => setMoment(null)}
        settings={
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
              <div className="w-full max-w-[14rem]">
                <SelectField
                  label={c.voteDuration}
                  icon={<Clock className="size-4" />}
                  accent={ACCENT}
                  value={String(session.durationSec)}
                  onChange={(v) => session.setDurationSec(Number(v))}
                  options={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2 rounded-2xl border-cyan-400/30 bg-cyan-400/10 font-extrabold text-cyan-100 hover:bg-cyan-400/20"
                onClick={openEditor}
              >
                <Pencil className="size-4" />
                {g.edit}
              </Button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border px-4 py-6 text-center sm:px-8 sm:py-8"
              style={{
                borderColor: `${ACCENT}40`,
                background: `
                  radial-gradient(80% 70% at 50% 0%, ${ACCENT}28, transparent 60%),
                  linear-gradient(180deg, oklch(0.14 0.05 220 / 0.9), oklch(0.09 0.03 285 / 0.96))
                `,
              }}
            >
              <button
                type="button"
                onClick={openEditor}
                className="absolute end-3 top-3 grid size-10 place-items-center rounded-full border border-white/15 bg-black/40 text-cyan-200 transition hover:bg-white/10 hover:text-white"
                aria-label={g.edit}
                title={g.edit}
              >
                <Pencil className="size-4" />
              </button>

              <p
                className="text-[11px] font-extrabold tracking-[0.28em] uppercase"
                style={{ color: GLOW }}
              >
                {c.voteQuestion}
              </p>
              <h3 className="font-brand mt-3 max-w-3xl text-balance text-3xl font-black leading-snug text-white sm:text-4xl lg:text-5xl">
                {question || "—"}
              </h3>
              <p className="mt-3 text-sm font-bold text-white/50">{g.howToVote}</p>

              <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3">
                {options.map((opt, i) => (
                  <div
                    key={`${opt}-${i}`}
                    className="rounded-2xl border px-4 py-4 text-center transition hover:scale-[1.02]"
                    style={{
                      borderColor: `${ACCENT}45`,
                      background: `linear-gradient(160deg, ${ACCENT}18, rgba(0,0,0,0.35))`,
                      boxShadow: `0 12px 30px -18px ${ACCENT}`,
                    }}
                  >
                    <span
                      className="mx-auto grid size-10 place-items-center rounded-xl text-base font-black"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})`,
                        color: "#041016",
                      }}
                    >
                      {i + 1}
                    </span>
                    <p className="mt-2.5 text-lg font-extrabold text-white">{opt}</p>
                  </div>
                ))}
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
                    {session.running ? c.voteRunning : c.voteStopped}
                  </p>
                  <p className="text-sm text-white/55 sm:text-base">
                    {session.running ? `${total} · ${clockLabel}` : `${total}`}
                  </p>
                </div>
              </div>

              {session.running ? (
                <Button
                  variant="destructive"
                  className="h-11 gap-1.5 rounded-2xl font-extrabold"
                  onClick={() => {
                    session.stop();
                    setMoment(stoppedMoment(c.voteStoppedMsg));
                  }}
                >
                  <Square className="size-4" /> {c.stop}
                </Button>
              ) : (
                <Button
                  className="h-11 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                  onClick={start}
                  disabled={!chatActive}
                >
                  {c.resume}
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
              <div className="mb-4 shrink-0 text-center sm:mb-5">
                <p
                  className="text-xs font-extrabold tracking-[0.28em] uppercase sm:text-sm"
                  style={{ color: GLOW }}
                >
                  {c.voteQuestion}
                </p>
                <h3 className="font-brand mt-2 text-balance text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                  {question}
                </h3>
                <p
                  className="font-brand mt-3 text-4xl font-bold tabular-nums sm:text-5xl"
                  style={
                    session.running && !urgent
                      ? { color: GLOW }
                      : session.running && urgent
                        ? { color: "var(--destructive)" }
                        : { color: "rgba(255,255,255,0.55)" }
                  }
                >
                  {clockLabel}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5 overflow-hidden sm:gap-3">
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
                        className="absolute inset-y-0 end-0 transition-[width] duration-700 ease-out"
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

              <p className="mt-4 text-center text-sm font-bold text-white/60">{c.oneVoteHint}</p>
            </div>
          </div>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-h-[min(92vh,720px)] max-w-lg overflow-y-auto rounded-3xl border-cyan-400/25 bg-background/95 pe-4 sm:rounded-3xl"
          dir={dir}
        >
          <DialogHeader className="pe-8 text-start">
            <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
              <Pencil className="size-5 text-cyan-300" />
              {g.editTitle}
            </DialogTitle>
            <DialogDescription>{g.editDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold tracking-wider text-white/60 uppercase">
                {c.voteQuestion}
              </span>
              <Input
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="h-12 rounded-2xl border-white/12 bg-black/30 text-base font-bold"
                placeholder={c.voteQuestion}
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5">
              <p className="mb-3 text-xs font-extrabold tracking-wider text-white/60 uppercase">
                {g.options} ({editOptions.length})
              </p>
              <ul className="space-y-2">
                {editOptions.map((opt, i) => (
                  <li
                    key={`edit-${i}`}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2"
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black"
                      style={{ background: `${ACCENT}22`, color: GLOW }}
                    >
                      {i + 1}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditOptions((o) => o.map((x, k) => (k === i ? val : x)));
                      }}
                      className="h-9 flex-1 rounded-lg border-white/10 bg-black/25 text-sm font-bold"
                    />
                    <button
                      type="button"
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-destructive/15 hover:text-destructive"
                      onClick={() => setEditOptions((l) => l.filter((_, k) => k !== i))}
                      disabled={editOptions.length <= 2}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <Input
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  placeholder={c.addOption}
                  className="h-10 flex-1 rounded-xl border-white/10 bg-black/25"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !editDraft.trim()) return;
                    setEditOptions((o) => [...o, editDraft.trim()]);
                    setEditDraft("");
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-white/12 font-bold"
                  onClick={() => {
                    if (!editDraft.trim()) return;
                    setEditOptions((o) => [...o, editDraft.trim()]);
                    setEditDraft("");
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl font-bold"
              onClick={() => setEditOpen(false)}
            >
              {c.back}
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-xl font-extrabold text-[#041016] hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
              disabled={editOptions.filter((o) => o.trim()).length < 2 || !editQuestion.trim()}
              onClick={saveEditor}
            >
              {g.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
