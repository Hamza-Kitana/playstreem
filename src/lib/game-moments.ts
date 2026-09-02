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

export function timeoutMoment(subtitle?: string): GameMoment {
  return {
    kind: "timeout",
    title: "انتهى الوقت!",
    subtitle: subtitle ?? "خلص العداد — هذي نتيجة الجولة.",
    actionLabel: "متابعة",
  };
}

export function winMoment(name: string, color?: string, subtitle?: string): GameMoment {
  return {
    kind: "win",
    title: "فاز!",
    subtitle: subtitle ?? "أول إجابة صحيحة من الشات",
    highlight: name,
    highlightColor: color,
    actionLabel: "التالي",
  };
}

export function loseMoment(subtitle?: string): GameMoment {
  return {
    kind: "lose",
    title: "ما حد فاز",
    subtitle: subtitle ?? "انتهت الجولة بدون فائز.",
    actionLabel: "متابعة",
  };
}

export function stoppedMoment(subtitle?: string): GameMoment {
  return {
    kind: "stopped",
    title: "تم الإيقاف",
    subtitle: subtitle ?? "أوقفت الجولة يدوياً.",
    actionLabel: "حسناً",
  };
}

export function successMoment(title: string, subtitle?: string): GameMoment {
  return {
    kind: "success",
    title,
    subtitle,
    actionLabel: "متابعة",
  };
}
