import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Medal, Star, Target, Users } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/Reveal";

export default function RateGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [criterionInput, setCriterionInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");
  const [criteriaDialogOpen, setCriteriaDialogOpen] = useState(true);
  const [peopleDialogOpen, setPeopleDialogOpen] = useState(false);
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
    if (!selectedCriterion && criteria.length > 0) {
      setSelectedCriterion(criteria[0] ?? "");
    }
  }, [criteria, selectedCriterion]);

  useEffect(() => {
    if (!selectedPerson && people.length > 0) {
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

  const start = () => {
    if (!selectedPerson || !selectedCriterion) return;
    roundLockedRef.current = false;
    setRatings([]);
    session.start();
  };

  const stop = () => {
    commitRound();
    session.stop();
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

  return (
    <GameCard id="rate" className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Dialog open={criteriaDialogOpen} onOpenChange={setCriteriaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعداد التصنيفات</DialogTitle>
            <DialogDescription>أضف الأشياء التي تريد تقييم الأشخاص عليها.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={criterionInput}
                onChange={(e) => setCriterionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addCriterion();
                }}
                placeholder="مثال: القوة"
              />
              <Button type="button" onClick={addCriterion}>
                إضافة
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {criteria.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-bold"
                  onClick={() => setCriteria((prev) => prev.filter((x) => x !== c))}
                >
                  {c} ×
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={criteria.length === 0}
              onClick={() => {
                setCriteriaDialogOpen(false);
                setPeopleDialogOpen(true);
              }}
            >
              التالي: إعداد الأشخاص
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={peopleDialogOpen} onOpenChange={setPeopleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعداد الأشخاص</DialogTitle>
            <DialogDescription>أضف الأشخاص الذين تريد تقييمهم.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={personInput}
                onChange={(e) => setPersonInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addPerson();
                }}
                placeholder="مثال: محمد"
              />
              <Button type="button" onClick={addPerson}>
                إضافة
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-bold"
                  onClick={() => setPeople((prev) => prev.filter((x) => x !== p))}
                >
                  {p} ×
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={people.length === 0}
              onClick={() => setPeopleDialogOpen(false)}
            >
              بدء التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Star className="size-5 text-accent" />
          <h4 className="text-lg font-extrabold">بطولة تقييم الأشخاص</h4>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-secondary/35 p-4 md:grid-cols-2">
          <Button type="button" variant="secondary" onClick={() => setCriteriaDialogOpen(true)}>
            <Target className="size-4" />
            تعديل التصنيفات ({criteria.length})
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPeopleDialogOpen(true)}>
            <Users className="size-4" />
            تعديل الأشخاص ({people.length})
          </Button>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
          <p className="text-sm font-extrabold">اختيار الجولة (حر)</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs font-bold text-muted-foreground">
              الشخص
              <select
                value={selectedPerson}
                disabled={session.running || people.length === 0}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2"
              >
                {people.length === 0 ? <option value="">أضف أشخاص أولاً</option> : null}
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-bold text-muted-foreground">
              التصنيف
              <select
                value={selectedCriterion}
                disabled={session.running || criteria.length === 0}
                onChange={(e) => setSelectedCriterion(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2"
              >
                {criteria.length === 0 ? <option value="">أضف تصنيفات أولاً</option> : null}
                {criteria.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            التقدم: {progressDone} / {progressTotal || 0} جولة معتمدة
          </p>
        </div>

        <SessionControls
          running={session.running}
          chatActive={chatActive}
          durationSec={session.durationSec}
          left={session.left}
          participantCount={session.participantCount}
          canStart={Boolean(selectedPerson && selectedCriterion)}
          startLabel="بدء التقييم"
          stopLabel="إيقاف واعتماد الجولة"
          hint="كل حساب يقيّم مرة واحدة فقط لكل جولة من 0 إلى 10."
          onDurationChange={session.setDurationSec}
          onStart={start}
          onStop={stop}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={roundResults.length === 0}
            onClick={() => setShowFinalResults(true)}
          >
            عرض النتيجة النهائية
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={session.running}
            onClick={resetTournament}
          >
            إعادة ضبط البطولة
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-transparent p-6 text-center">
          <div className="absolute -bottom-14 left-1/2 size-56 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
          <p className="relative text-xs font-bold tracking-widest text-accent">
            {session.running ? "الجولة مفتوحة" : "متوسط الجولة الحالية"}
          </p>
          <p className="relative mt-1 text-6xl font-extrabold tabular-nums">
            <span className="shimmer-text">{roundAvg.toFixed(1)}</span>
          </p>
          <p className="relative text-sm text-muted-foreground">{ratings.length} تقييم</p>
          <div className="relative mx-auto mt-5 h-3 max-w-sm overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary via-chart-3 to-accent transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex h-28 items-end gap-1.5">
          {dist.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-primary/80 transition-[height] duration-500"
                style={{ height: `${(count / maxD) * 80}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-secondary/40 p-5">
        <h4 className="mb-4 text-lg font-extrabold">النتائج</h4>
        {showFinalResults ? (
          ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد نتائج كافية للعرض.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, i) => (
                <div
                  key={r.person}
                  className={`animate-pop-in flex items-center justify-between rounded-xl px-3 py-2 ${
                    i < 3 ? "bg-gradient-to-l from-primary/20 to-accent/20" : "bg-background/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-background text-xs font-extrabold">
                      {i + 1}
                    </span>
                    <span className="font-bold">{r.person}</span>
                    {i < 3 ? <Medal className="size-4 text-accent" /> : null}
                  </div>
                  <span className="text-sm">
                    <span className="font-extrabold text-primary">{r.avg.toFixed(2)}</span>
                    <span className="text-muted-foreground"> · {r.voters} صوت</span>
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {roundResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">لم تُحسم أي جولة بعد.</p>
            ) : null}
            {roundResults.map((h, i) => (
              <div
                key={`${h.person}-${h.criterion}-${i}`}
                className="animate-pop-in flex items-center justify-between rounded-xl bg-background/50 px-3 py-2"
              >
                <span className="font-bold">
                  {h.person} · <span className="text-muted-foreground">{h.criterion}</span>
                </span>
                <span className="text-sm">
                  <span className="font-extrabold text-primary">{h.avg.toFixed(1)}</span>
                  <span className="text-muted-foreground"> / {h.count} صوت</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {showFinalResults ? (
          <Button
            variant="ghost"
            className="mt-4 w-full"
            disabled={session.running}
            onClick={() => setShowFinalResults(false)}
          >
            إخفاء النتيجة النهائية
          </Button>
        ) : null}
      </div>
    </GameCard>
  );
}
