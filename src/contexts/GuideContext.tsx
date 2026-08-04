import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "al-daboor-guide-seen";

type GuideContextValue = {
  open: boolean;
  openGuide: () => void;
  closeGuide: (markSeen?: boolean) => void;
  /** Call after boot splash finishes — opens guide if user hasn't seen it. */
  offerGuideAfterBoot: () => void;
};

const GuideContext = createContext<GuideContextValue | null>(null);

function hasSeenGuide() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openGuide = useCallback(() => setOpen(true), []);

  const closeGuide = useCallback((markSeen = true) => {
    setOpen(false);
    if (markSeen) persistSeen();
  }, []);

  const offerGuideAfterBoot = useCallback(() => {
    if (!hasSeenGuide()) setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ open, openGuide, closeGuide, offerGuideAfterBoot }),
    [open, openGuide, closeGuide, offerGuideAfterBoot],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide must be used within GuideProvider");
  return ctx;
}
