import { getMessages } from "@/i18n";
import type { Locale } from "@/i18n/types";

export type GameMomentKind = "timeout" | "win" | "lose" | "stopped" | "success";

export type GameMoment = {
  kind: GameMomentKind;
  title: string;
  subtitle?: string;
  highlight?: string;
  highlightColor?: string;
  actionLabel?: string;
  secondaryLabel?: string;
  onAction?: () => void;
  onSecondary?: () => void;
};

export function createGameMoments(locale: Locale) {
  const m = getMessages(locale);

  return {
    timeoutMoment(subtitle?: string) {
      return {
        kind: "timeout" as const,
        title: m.moments.timeoutTitle,
        subtitle: subtitle ?? m.moments.timeoutSub,
        actionLabel: m.common.continue,
      };
    },
    winMoment(name: string, color?: string, subtitle?: string) {
      return {
        kind: "win" as const,
        title: m.moments.winTitle,
        subtitle: subtitle ?? m.moments.winSub,
        highlight: name,
        highlightColor: color,
        actionLabel: m.moments.next,
      };
    },
    loseMoment(subtitle?: string) {
      return {
        kind: "lose" as const,
        title: m.moments.loseTitle,
        subtitle: subtitle ?? m.moments.loseSub,
        actionLabel: m.common.continue,
      };
    },
    stoppedMoment(subtitle?: string) {
      return {
        kind: "stopped" as const,
        title: m.moments.stoppedTitle,
        subtitle: subtitle ?? m.moments.stoppedSub,
        actionLabel: m.common.ok,
      };
    },
    successMoment(title: string, subtitle?: string) {
      return {
        kind: "success" as const,
        title,
        subtitle,
        actionLabel: m.common.continue,
      };
    },
  };
}

/** @deprecated Use createGameMoments(locale) from useGameMoments() */
export function timeoutMoment(subtitle?: string) {
  return createGameMoments("ar").timeoutMoment(subtitle);
}
export function winMoment(name: string, color?: string, subtitle?: string) {
  return createGameMoments("ar").winMoment(name, color, subtitle);
}
export function loseMoment(subtitle?: string) {
  return createGameMoments("ar").loseMoment(subtitle);
}
export function stoppedMoment(subtitle?: string) {
  return createGameMoments("ar").stoppedMoment(subtitle);
}
export function successMoment(title: string, subtitle?: string) {
  return createGameMoments("ar").successMoment(title, subtitle);
}
