import { Clock3, Play, Square } from "lucide-react";
import { DURATION_OPTIONS, formatClock } from "@/hooks/useGameSession";
import { Button } from "@/components/ui/button";

type Props = {
  running: boolean;
  chatActive: boolean;
  durationSec: number;
  left: number | null;
  participantCount: number;
  canStart?: boolean;
  startLabel?: string;
  stopLabel?: string;
  hint?: string;
  onDurationChange: (sec: number) => void;
  onStart: () => void;
  onStop: () => void;
};

export default function SessionControls({
  running,
  chatActive,
  durationSec,
  left,
  participantCount,
  canStart = true,
  startLabel = "بدء",
  stopLabel = "إيقاف",
  hint = "كل مشاهد يشارك مرة واحدة فقط أثناء الجلسة.",
  onDurationChange,
  onStart,
  onStop,
}: Props) {
  const urgent = left != null && left <= 10;

  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[9rem] flex-1">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Clock3 className="size-3.5" />
            مدة الجلسة
          </label>
          <select
            value={durationSec}
            disabled={running}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm font-bold outline-none focus-visible:ring-2 disabled:opacity-60"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {running ? (
          <Button type="button" variant="destructive" className="h-11 px-5 font-extrabold" onClick={onStop}>
            <Square className="size-4" />
            {stopLabel}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 px-5 font-extrabold"
            disabled={!chatActive || !canStart}
            onClick={onStart}
          >
            <Play className="size-4" />
            {startLabel}
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span
          className={
            running
              ? "inline-flex items-center gap-2 text-primary"
              : "text-muted-foreground"
          }
        >
          <span
            className={`size-2 rounded-full ${running ? "animate-pulse bg-primary" : "bg-muted-foreground/40"}`}
          />
          {running ? "الجلسة شغّالة" : "بانتظار البدء"}
          {running && left != null ? (
            <span className={`tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}>
              · {formatClock(left)}
            </span>
          ) : null}
          {running && left == null ? <span className="text-muted-foreground">· بدون حد زمني</span> : null}
        </span>
        <span className="text-muted-foreground">
          مشاركون: <span className="text-foreground tabular-nums">{participantCount}</span>
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{hint}</p>
      {!chatActive ? (
        <p className="mt-1 text-[11px] font-bold text-destructive">اربط كيك قبل البدء.</p>
      ) : null}
    </div>
  );
}
