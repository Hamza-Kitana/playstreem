import { createContext, useContext, type ReactNode } from "react";
import { useKickChat } from "@/hooks/useKickChat";

type KickChatValue = ReturnType<typeof useKickChat>;

const KickChatContext = createContext<KickChatValue | null>(null);

export function KickChatProvider({ children }: { children: ReactNode }) {
  const chat = useKickChat();
  return <KickChatContext.Provider value={chat}>{children}</KickChatContext.Provider>;
}

export function useKickChatContext() {
  const value = useContext(KickChatContext);
  if (!value) {
    throw new Error("useKickChatContext must be used within KickChatProvider");
  }
  return value;
}
