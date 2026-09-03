import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Medal,
  Play,
  Plus,
  Square,
  Star,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { useGameMoments } from "@/hooks/useGameMoments";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";
import type { GameMoment } from "@/lib/game-moments";

const RATE_SETUP_STORAGE_KEY = "rate-game-setup-v1";
const ACCENT = "#facc15";
const GLOW = "#fde047";

export default function RateGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const { stoppedMoment, successMoment } = useGameMoments();
  const g = messages.games.rate;
  const c = messages.common;

  const [phase, setPhase] = useState<Phase>("setup");
  const [criterionInput, setCriterionInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");
  const [modalPerson, setModalPerson] = useState<string | null>(null);
  const [ratings, setRatings] = useState<number[]>([]);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const [roundResults, setRoundResults] = useState<
    { person: string; criterion: string; avg: number; count: number }[]
  >([]);
  const session = useGameSession(60);

  const ratingsRef = useRef(ratings);
  const roundLockedRef = useRef(false);
  const selectionRef = useRef({ person: selectedPerson, criterion: selectedCriterion });
  ratingsRef.current = ratings;
  selectionRef.current = { person: selectedPerson, criterion: selectedCriterion };

  const roundAvg = useMemo(
    () => (ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0),
    [ratings],
  );

  const addUnique = (items: string[], value: string) => {
    const clean = value.trim();
    if (!clean) return items;
    if (items.some((i) => i.toLowerCase() === clean.toLowerCase())) return items;
    return [...items, clean];
  };

  const addCriterion = useCallback(() => {
    setCriteria((prev) => addUnique(prev, criterionInput));
    setCriterionInput("");
  }, [criterionInput]);

  const addPerson = useCallback(() => {
    setPeople((prev) => addUnique(prev, personInput));
    setPersonInput("");
  }, [personInput]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RATE_SETUP_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { criteria?: unknown; people?: unknown };
      if (Array.isArray(parsed.criteria)) {
        setCriteria(parsed.criteria.filter((x): x is string => typeof x === "string"));
      }
      if (Array.isArray(parsed.people)) {
        setPeople(parsed.people.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // Ignore invalid stored state.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      RATE_SETUP_STORAGE_KEY,
      JSON.stringify({ criteria, people }),
    );
  }, [criteria, people]);

  useEffect(() => {
    if (!selectedCriterion && criteria.length > 0) {
      setSelectedCriterion(criteria[0] ?? "");
    }
  }, [criteria, selectedCriterion]);

  useEffect(() => {
    if (!selectedPerson && people.length > 0) {
      setSelectedPerson(people[0] ?? "");
    }
  }, [people, selectedPerson]);

  useEffect(() => {
    if (selectedCriterion && !criteria.includes(selectedCriterion)) {
      setSelectedCriterion(criteria[0] ?? "");
    }
  }, [criteria, selectedCriterion]);

  useEffect(() => {
    if (selectedPerson && !people.includes(selectedPerson)) {
      setSelectedPerson(people[0] ?? "");
    }
  }, [people, selectedPerson]);

  const commitRound = useCallback(() => {
    if (roundLockedRef.current) return;
    roundLockedRef.current = true;
    const current = ratingsRef.current;
    if (!selectedPerson || !selectedCriterion) return;
    const a = current.length ? current.reduce((x, y) => x + y, 0) / current.length : 0;
    setRoundResults((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (x) => x.person === selectedPerson && x.criterion === selectedCriterion,
      );
      const record = {
        person: selectedPerson,
        criterion: selectedCriterion,
        avg: current.length ? a : 0,
        count: current.length,
      };
      if (idx >= 0) {
        next[idx] = record;
        return next;
      }
      return [...next, record];
    });
  }, [selectedCriterion, selectedPerson]);

  useEffect(() => {
    session.setOnExpire(() => {
      commitRound();
      const { person, criterion } = selectionRef.current;
      setMoment(
        successMoment(
          g.roundEnded,
          person && criterion ? `${person} · ${criterion}` : g.roundEndedSub,
        ),
      );
    });
    return () => session.setOnExpire(null);
  }, [commitRound, session.setOnExpire, successMoment, g.roundEnded, g.roundEndedSub]);

  useNewMessages(chatMessages, session.running, (m) => {
    const who = participantKey(m);
    if (!who) return;
    if (session.hasParticipated(who)) return;
    const t = normalizeAr(m.text);
    const n = Number(t.split(" ")[0]);
    if (!Number.isFinite(n) || n < 0 || n > 10) return;
    if (!session.tryClaim(who)) return;
    setRatings((r) => [...r, Math.round(n)]);
  });

  const dist = useMemo(() => {
    const d = Array.from({ length: 11 }, () => 0);
    for (const r of ratings) d[r] = (d[r] ?? 0) + 1;
    return d;
  }, [ratings]);
  const maxD = Math.max(...dist, 1);

  const startRoundFor = (person: string, criterion: string) => {
    if (session.running) return;
    setSelectedPerson(person);
    setSelectedCriterion(criterion);
    setShowFinalResults(false);
    setModalPerson(null);
    roundLockedRef.current = false;
    setRatings([]);
    session.start();
  };

  const stopRound = () => {
    commitRound();
    session.stop();
    setMoment(stoppedMoment(g.stoppedSub));
  };

  const startTournament = () => {
    setMoment(null);
    setShowFinalResults(false);
    setPhase("playing");
  };

  const backToSetup = () => {
    session.stop();
    setMoment(null);
    setModalPerson(null);
    setPhase("setup");
  };

  const resetTournament = () => {
    session.stop();
    setRatings([]);
    setRoundResults([]);
    setShowFinalResults(false);
    setModalPerson(null);
    roundLockedRef.current = false;
  };

  const ranking = useMemo(() => {
    const byPerson = new Map<string, { total: number; votedCriteria: number; voters: number }>();
    for (const row of roundResults) {
      const x = byPerson.get(row.person) ?? { total: 0, votedCriteria: 0, voters: 0 };
      x.total += row.avg;
      x.votedCriteria += 1;
      x.voters += row.count;
      byPerson.set(row.person, x);
    }
    return Array.from(byPerson.entries())
      .map(([person, x]) => ({
        person,
        avg: x.votedCriteria ? x.total / x.votedCriteria : 0,
        voters: x.voters,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [roundResults]);

  const progressDone = roundResults.length;
  const progressTotal = people.length * criteria.length;
  const pct = (roundAvg / 10) * 100;
  const canStart = criteria.length > 0 && people.length > 0;
  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(session.durationSec > 0 ? session.durationSec : 0);

  const modalDone =
    modalPerson == null
      ? 0
      : roundResults.filter((r) => r.person === modalPerson).length;

  return (
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Star />}
        title={g.title}
        description={g.desc}
        chatActive={chatActive}
        canStart={canStart}
        skipCountdown
        setupCtaLabel={canStart ? g.setupCta : g.setupCtaNeed}
        startLabel={g.start}
        onGoReady={() => {
          if (canStart) setPhase("ready");
        }}
        onStart={startTournament}
        onBackToSetup={backToSetup}
        moment={moment}
        onDismissMoment={() => setMoment(null)}
        settings={
          <div className="grid gap-4 md:grid-cols-2">
            <ListEditor
              title={c.criteria}
              icon={<Target className="size-4" />}
              accent={ACCENT}
              glow={GLOW}
              items={criteria}
              input={criterionInput}
              onInput={setCriterionInput}
              onAdd={addCriterion}
              onRemove={(v) => setCriteria((prev) => prev.filter((x) => x !== v))}
              placeholder={c.criteriaPh}
            />
            <ListEditor
              title={c.people}
              icon={<Users className="size-4" />}
              accent={ACCENT}
              glow={GLOW}
              items={people}
              input={personInput}
              onInput={setPersonInput}
              onAdd={addPerson}
              onRemove={(v) => setPeople((prev) => prev.filter((x) => x !== v))}
              placeholder={c.peoplePh}
            />
            <div className="md:col-span-2">
              <SelectField
                label={c.roundDuration}
                icon={<Clock className="size-4" />}
                accent={ACCENT}
                value={String(session.durationSec)}
                onChange={(v) => session.setDurationSec(Number(v))}
                options={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
              />
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
                  <Star className="size-5 sm:size-6" />
                </span>
                <div>
                  <p className="text-base font-extrabold text-white sm:text-lg">
                    {session.running
                      ? `${c.roundLabel}: ${selectedPerson} · ${selectedCriterion}`
                      : c.championship}
                  </p>
                  <p className="text-sm text-white/55 sm:text-base">
                    {progressDone} / {progressTotal || 0} {c.roundLabel}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-white/12 bg-white/[0.03] font-bold"
                  disabled={session.running}
                  onClick={resetTournament}
                >
                  {g.reset}
                </Button>
                <Button
                  className="h-10 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                  disabled={roundResults.length === 0}
                  onClick={() => setShowFinalResults((v) => !v)}
                >
                  <Medal className="size-4" /> {c.finalResult}
                </Button>
              </div>
            </div>

            <div className="game-play-grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div
                className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border p-4 sm:p-5"
                style={{
                  borderColor: `${ACCENT}44`,
                  background:
                    "linear-gradient(180deg, oklch(0.14 0.06 90 / 0.7), oklch(0.09 0.03 285 / 0.9))",
                }}
              >
                <p className="mb-4 shrink-0 text-base font-extrabold text-white sm:text-lg">
                  {g.pickPerson}
                </p>
                {people.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-center text-base text-white/50">
                    {g.noPeople}
                  </p>
                ) : (
                  <div className="min-h-0 flex-1 overflow-y-auto pe-1">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {people.map((person) => {
                        const doneForPerson = roundResults.filter((r) => r.person === person).length;
                        const allDone = criteria.length > 0 && doneForPerson >= criteria.length;
                        const isLive = session.running && selectedPerson === person;
                        const personAvg =
                          doneForPerson > 0
                            ? roundResults
                                .filter((r) => r.person === person)
                                .reduce((s, r) => s + r.avg, 0) / doneForPerson
                            : null;

                        return (
                          <button
                            key={person}
                            type="button"
                            disabled={session.running}
                            onClick={() => setModalPerson(person)}
                            className="group relative flex min-h-[11rem] flex-col overflow-hidden rounded-[1.5rem] border p-5 text-start transition disabled:cursor-not-allowed disabled:opacity-60 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60"
                            style={{
                              borderColor: isLive || allDone ? `${ACCENT}88` : `${ACCENT}35`,
                              background: `
                                radial-gradient(90% 80% at 100% 0%, ${ACCENT}28, transparent 55%),
                                linear-gradient(165deg, oklch(0.16 0.05 90 / 0.95), oklch(0.10 0.03 285 / 0.98))
                              `,
                              boxShadow: isLive
                                ? `0 0 0 1px ${ACCENT}66, 0 18px 40px -20px ${ACCENT}`
                                : `0 16px 36px -22px ${ACCENT}88`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p
                                  className="text-[11px] font-extrabold tracking-[0.22em] uppercase"
                                  style={{ color: GLOW }}
                                >
                                  {allDone ? g.done : g.pending}
                                </p>
                                <h3 className="mt-1 truncate font-brand text-2xl font-black text-white sm:text-3xl">
                                  {person}
                                </h3>
                              </div>
                              <span
                                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums"
                                style={{
                                  background: allDone ? `${ACCENT}30` : "rgba(255,255,255,0.07)",
                                  color: allDone ? GLOW : "rgba(255,255,255,0.65)",
                                }}
                              >
                                {doneForPerson}/{criteria.length || 0}
                              </span>
                            </div>

                            <div className="mt-auto pt-6">
                              <div className="mb-2 flex items-end justify-between gap-2">
                                <span className="text-sm text-white/50">
                                  {personAvg != null ? personAvg.toFixed(1) : "—"}
                                </span>
                                <span className="text-xs font-bold text-white/40 group-hover:text-yellow-200/80">
                                  {g.personModalTitle} →
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${criteria.length > 0 ? (doneForPerson / criteria.length) * 100 : 0}%`,
                                    background: `linear-gradient(90deg, ${ACCENT}, ${GLOW})`,
                                  }}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <aside
                className="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border p-4 sm:p-5"
                style={{
                  borderColor: `${ACCENT}44`,
                  background: `radial-gradient(80% 60% at 50% 0%, ${ACCENT}20, transparent 65%), oklch(0.10 0.03 285 / 0.95)`,
                }}
              >
                <p
                  className="shrink-0 text-center text-xs font-extrabold tracking-[0.28em] uppercase sm:text-sm"
                  style={{ color: GLOW }}
                >
                  {session.running ? c.currentRound : c.roundAverage}
                </p>
                <p className="mt-2 shrink-0 text-center text-base font-extrabold text-white sm:text-lg">
                  {selectedPerson && selectedCriterion
                    ? `${selectedPerson} · ${selectedCriterion}`
                    : "—"}
                </p>

                {session.running ? (
                  <p className="mt-2 text-center text-xs font-bold text-yellow-100/70">{g.liveHint}</p>
                ) : null}

                <div className="mt-4 text-center">
                  <p
                    className="font-brand text-5xl font-black leading-none tabular-nums sm:text-6xl"
                    style={{ color: GLOW }}
                  >
                    {roundAvg.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    {ratings.length} {g.ratingsCount}
                  </p>
                </div>

                <div className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${ACCENT}, ${GLOW})`,
                    }}
                  />
                </div>

                <div className="mt-5 flex h-24 items-end gap-1.5">
                  {dist.map((count, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-md transition-[height] duration-500"
                        style={{
                          height: `${(count / maxD) * 70}px`,
                          background: `linear-gradient(180deg, ${GLOW}, ${ACCENT})`,
                        }}
                      />
                      <span className="text-[10px] text-white/45">{i}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-white/55">
                    {session.running ? clockLabel : c.waitingRound}
                  </span>
                  {session.running ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg font-extrabold"
                      onClick={stopRound}
                    >
                      <Square className="size-3.5" /> {c.stop}
                    </Button>
                  ) : null}
                </div>
              </aside>
            </div>

            {showFinalResults ? (
              <div
                className="rounded-3xl border p-6"
                style={{ borderColor: `${ACCENT}44`, background: `${ACCENT}0d` }}
              >
                <h4 className="mb-4 text-lg font-extrabold text-white">{c.finalResult}</h4>
                {ranking.length === 0 ? (
                  <p className="text-sm text-white/55">—</p>
                ) : (
                  <div className="space-y-2">
                    {ranking.map((r, i) => (
                      <div
                        key={r.person}
                        className="animate-pop-in flex items-center justify-between rounded-2xl px-4 py-3"
                        style={{
                          background: i < 3 ? `${ACCENT}18` : "rgba(255,255,255,0.04)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-8 place-items-center rounded-full text-xs font-black"
                            style={{
                              background:
                                i === 0
                                  ? `linear-gradient(135deg, ${GLOW}, ${ACCENT})`
                                  : "rgba(0,0,0,0.4)",
                              color: i === 0 ? "black" : "white",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="font-bold text-white">{r.person}</span>
                          {i < 3 ? <Medal className="size-4" style={{ color: GLOW }} /> : null}
                        </div>
                        <span className="text-sm">
                          <span className="font-extrabold tabular-nums" style={{ color: GLOW }}>
                            {r.avg.toFixed(2)}
                          </span>
                          <span className="text-white/55"> · {r.voters}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        }
      />

      <Dialog
        open={modalPerson != null}
        onOpenChange={(open) => {
          if (!open) setModalPerson(null);
        }}
      >
        <DialogContent
          className="max-h-[85vh] overflow-y-auto border-yellow-400/30 bg-[#120f08] sm:max-w-lg sm:rounded-3xl"
          dir={dir}
        >
          <DialogHeader className="pe-8 text-start">
            <DialogTitle className="flex items-center gap-2 text-2xl font-extrabold text-white">
              <span
                className="grid size-10 place-items-center rounded-2xl"
                style={{ background: `${ACCENT}22`, color: ACCENT }}
              >
                <Star className="size-5" />
              </span>
              {g.personModalTitle}: {modalPerson}
            </DialogTitle>
            <DialogDescription className="text-start text-white/60">
              {g.personModalDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-1 flex items-center justify-between text-xs font-bold text-white/45">
            <span>
              {modalDone}/{criteria.length || 0}
            </span>
            <span style={{ color: GLOW }}>
              {modalDone >= (criteria.length || 0) && criteria.length > 0 ? g.done : g.pending}
            </span>
          </div>

          <div className="space-y-2.5">
            {criteria.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/12 px-4 py-6 text-center text-sm text-white/50">
                —
              </p>
            ) : (
              criteria.map((criterion) => {
                const existing =
                  modalPerson == null
                    ? undefined
                    : roundResults.find(
                        (r) => r.person === modalPerson && r.criterion === criterion,
                      );
                const isActive =
                  session.running &&
                  selectedPerson === modalPerson &&
                  selectedCriterion === criterion;

                return (
                  <div
                    key={criterion}
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3.5"
                    style={{
                      borderColor: existing || isActive ? `${ACCENT}66` : "rgba(255,255,255,0.10)",
                      background: existing
                        ? `${ACCENT}14`
                        : "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.35))",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-extrabold text-white">{criterion}</p>
                      {existing ? (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold" style={{ color: GLOW }}>
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          {existing.avg.toFixed(1)} · {existing.count} {g.ratingsCount}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-white/40">{g.pending}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      disabled={session.running || !chatActive || !modalPerson}
                      className="h-11 shrink-0 gap-1.5 rounded-xl px-4 font-extrabold text-[#1a1400] hover:brightness-110 disabled:opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})`,
                      }}
                      onClick={() => {
                        if (modalPerson) startRoundFor(modalPerson, criterion);
                      }}
                    >
                      <Play className="size-4 fill-current" />
                      {g.startCriterion}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ListEditor({
  title,
  icon,
  accent,
  glow,
  items,
  input,
  onInput,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  glow: string;
  items: string[];
  input: string;
  onInput: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-white/60 uppercase">
          <span style={{ color: accent }}>{icon}</span>
          {title}
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
          style={{ background: `${accent}22`, color: glow }}
        >
          {items.length}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-xl border-white/10 bg-black/25 text-sm font-bold"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl border-white/12 bg-white/[0.03] font-bold"
          onClick={onAdd}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-3 text-center text-xs text-white/45">
          —
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="group flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold text-white"
              style={{ borderColor: `${accent}44`, background: `${accent}12` }}
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="grid size-4 place-items-center rounded-full text-white/50 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
