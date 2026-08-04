import { useEffect, useState, type ReactNode } from "react";
import LoadingScreen from "@/components/LoadingScreen";

type Props = {
  children: ReactNode;
  onFinished?: () => void;
};

/**
 * One-shot branded splash on first paint. Completes shortly after mount,
 * then fades out so the app feels intentional without blocking forever.
 */
export default function BootSplash({ children, onFinished }: Props) {
  const [progress, setProgress] = useState(8);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onFinished?.();
    };

    const preferReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (preferReduce) {
      setProgress(100);
      setVisible(false);
      finish();
      return;
    }

    let frame = 0;
    const tick = window.setInterval(() => {
      frame += 1;
      setProgress((p) => {
        if (frame < 8) return Math.min(p + 9, 55);
        if (frame < 16) return Math.min(p + 4, 82);
        return Math.min(p + 2.5, 100);
      });
    }, 90);

    const done = window.setTimeout(() => {
      setProgress(100);
      setExiting(true);
    }, 1600);

    const hide = window.setTimeout(() => {
      setVisible(false);
      finish();
    }, 2100);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
      window.clearTimeout(hide);
    };
  }, [onFinished]);

  return (
    <>
      {children}
      {visible ? (
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-500 ${
            exiting ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <LoadingScreen progress={progress} label="تحضير Al-Daboor…" />
        </div>
      ) : null}
    </>
  );
}
