import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Medal,
  Plus,
  Square,
  Star,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";

const RATE_SETUP_STORAGE_KEY = "rate-game-setup-v1";
const ACCENT = "#facc15";
const GLOW = "#fde047";

export default function RateGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [criterionInput, setCriterionInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");
  const [ratings, setRatings] = useState<number[]>([]);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [roundResults, setRoundResults] = useState<
    { person: string; criterion: string; avg: number; count: number }[]
  >([]);
  const session = useGameSession(60);

  const ratingsRef = useRef(ratings);
  const roundLockedRef = useRef(false);
  ratingsRef.current = ratings;

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
    });
  }, [commitRound, session]);

  useNewMessages(messages, session.running, (m) => {
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
    roundLockedRef.current = false;
    setRatings([]);
    session.start();
  };

  const stopRound = () => {
    commitRound();
    session.stop();
  };

  const startTournament = () => {
    setShowFinalResults(false);
    setPhase("playing");
  };

  const backToSetup = () => {
    session.stop();
    setPhase("setup");
  };

  const resetTournament = () => {
    session.stop();
    setRatings([]);
    setRoundResults([]);
    setShowFinalResults(false);
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

  return (
    <GameStage
      phase={phase}
      accent={ACCENT}
      glow={GLOW}
      icon={<Star />}
      title="بطولة التقييم"
      description="ضيف الأشخاص والتصنيفات — الجمهور يعطي رقم من 0-10 من الشات، ويتحدد الفائز بالمتوسط."
      chatActive={chatActive}
      canStart={canStart}
      setupCtaLabel={canStart ? "التالي · جهّز البطولة" : "ضيف تصنيف وشخص أولاً"}
      startLabel="ابدأ البطولة"
      onGoReady={() => {
        if (canStart) setPhase("ready");
      }}
      onStart={startTournament}
      onBackToSetup={backToSetup}
      settings={
        <div className="grid gap-4 md:grid-cols-2">
          <ListEditor
            title="التصنيفات"
            icon={<Target className="size-4" />}
            accent={ACCENT}
            glow={GLOW}
            items={criteria}
            input={criterionInput}
            onInput={setCriterionInput}
            onAdd={addCriterion}
            onRemove={(v) => setCriteria((prev) => prev.filter((x) => x !== v))}
            placeholder="مثال: القوة"
          />
          <ListEditor
            title="الأشخاص"
            icon={<Users className="size-4" />}
            accent={ACCENT}
            glow={GLOW}
            items={people}
            input={personInput}
            onInput={setPersonInput}
            onAdd={addPerson}
            onRemove={(v) => setPeople((prev) => prev.filter((x) => x !== v))}
            placeholder="مثال: محمد"
          />
          <div className="md:col-span-2">
            <SelectField
              label="مدة الجولة"
              icon={<Clock className="size-4" />}
              accent={ACCENT}
              value={String(session.durationSec)}
              onChange={(v) => session.setDurationSec(Number(v))}
              options={DURATION_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </div>
        </div>
      }
      play={
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Top bar */}
          <div
            className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4"
            style={{ borderColor: `${ACCENT}44` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-2xl"
                style={{ background: `${ACCENT}22`, color: ACCENT }}
              >
                <Star className="size-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-white">
                  {session.running ? `جولة: ${selectedPerson} · ${selectedCriterion}` : "بطولة تقييم"}
                </p>
                <p className="text-[11px] text-white/50">
                  التقدم: {progressDone} / {progressTotal || 0} جولة
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
                إعادة ضبط
              </Button>
              <Button
                className="h-10 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                disabled={roundResults.length === 0}
                onClick={() => setShowFinalResults((v) => !v)}
              >
                <Medal className="size-4" /> النتيجة النهائية
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Cards grid */}
            <div
              className="rounded-[1.75rem] border p-5"
              style={{
                borderColor: `${ACCENT}44`,
                background: "linear-gradient(180deg, oklch(0.14 0.06 90 / 0.7), oklch(0.09 0.03 285 / 0.9))",
              }}
            >
              <p className="mb-4 text-sm font-extrabold text-white">اختر شخص وتصنيف لبدء الجولة</p>
              {people.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-center text-sm text-white/50">
                  ما في أشخاص — رجعت للإعدادات؟
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {people.map((person) => {
                    const doneForPerson = roundResults.filter((r) => r.person === person).length;
                    const allDone = criteria.length > 0 && doneForPerson >= criteria.length;
                    return (
                      <div
                        key={person}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-extrabold text-white">{person}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                            style={{
                              background: allDone ? `${ACCENT}25` : "rgba(255,255,255,0.06)",
                              color: allDone ? GLOW : "rgba(255,255,255,0.55)",
                            }}
                          >
                            {doneForPerson} / {criteria.length}
                          </span>
                        </div>

                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${criteria.length > 0 ? (doneForPerson / criteria.length) * 100 : 0}%`,
                              background: `linear-gradient(90deg, ${ACCENT}, ${GLOW})`,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {criteria.map((criterion) => {
                            const existing = roundResults.find(
                              (r) => r.person === person && r.criterion === criterion,
                            );
                            return (
                              <button
                                key={`${person}-${criterion}`}
                                type="button"
                                disabled={session.running || !chatActive}
                                onClick={() => startRoundFor(person, criterion)}
                                className="rounded-full border px-3 py-1 text-[11px] font-bold text-white/85 transition disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
                                style={{
                                  borderColor: existing ? `${ACCENT}66` : "rgba(255,255,255,0.10)",
                                  background: existing ? `${ACCENT}22` : "rgba(0,0,0,0.35)",
                                }}
                              >
                                {criterion}
                                {existing ? (
                                  <span
                                    className="ms-1 tabular-nums"
                                    style={{ color: GLOW }}
                                  >
                                    · {existing.avg.toFixed(1)}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live scoreboard */}
            <aside
              className="rounded-[1.75rem] border p-5"
              style={{
                borderColor: `${ACCENT}44`,
                background: `radial-gradient(80% 60% at 50% 0%, ${ACCENT}20, transparent 65%), oklch(0.10 0.03 285 / 0.95)`,
              }}
            >
              <p
                className="text-[11px] font-extrabold tracking-[0.28em] uppercase text-center"
                style={{ color: GLOW }}
              >
                {session.running ? "الجولة الحالية" : "متوسط الجولة"}
              </p>
              <p className="mt-2 text-center text-sm font-extrabold text-white">
                {selectedPerson && selectedCriterion
                  ? `${selectedPerson} · ${selectedCriterion}`
                  : "—"}
              </p>

              <div className="mt-4 text-center">
                <p
                  className="font-brand text-6xl font-black leading-none tabular-nums"
                  style={{ color: GLOW }}
                >
                  {roundAvg.toFixed(1)}
                </p>
                <p className="mt-1 text-xs text-white/55">{ratings.length} تقييم</p>
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
                  {session.running ? `متبقّي ${clockLabel}` : "بانتظار جولة"}
                </span>
                {session.running ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-lg font-extrabold"
                    onClick={stopRound}
                  >
                    <Square className="size-3.5" /> إيقاف واعتماد
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
              <h4 className="mb-4 text-lg font-extrabold text-white">النتائج النهائية</h4>
              {ranking.length === 0 ? (
                <p className="text-sm text-white/55">لا توجد نتائج كافية للعرض.</p>
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
                        <span className="text-white/55"> · {r.voters} صوت</span>
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
          لا يوجد {title.toLowerCase()} — ضيف من فوق
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
