import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { type GenerateResponse } from "@/lib/api/backend";

export type ChatMsg = { role: "you" | "ai"; text: string; loading?: boolean };
export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMsg[];
  result: GenerateResponse | null;
  resultsHistory?: GenerateResponse[];
};

export interface DesignContextProps {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  activeConversation: Conversation | null;
  handleNew: () => void;
  handleDelete: (id: string) => void;
  updateActive: (patch: Partial<Conversation>) => void;
  updateActiveResult: (result: GenerateResponse) => void;
  updateConversationResult: (id: string, result: GenerateResponse) => void;
  renameConversation: (id: string, title: string) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
}

const DesignContext = createContext<DesignContextProps | undefined>(undefined);

const STORAGE_KEY = "silicofeller.designer.conversations.v2";
const WELCOME: ChatMsg = {
  role: "ai",
  text: "Welcome to Silicofeller AI Quantum Designer. Describe the architecture, qubit counts, topological interfaces, or cryogenic constraints of the processor you wish to synthesize. Our solver will generate physical layouts, transmission meanders, and compile-ready Qiskit Metal code.",
};

export function newConversation(index?: number): Conversation {
  const now = Date.now();
  const label = index !== undefined ? `Untitled Project ${index + 1}` : "Untitled Project 1";
  return {
    id: `c_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title: label,
    createdAt: now,
    updatedAt: now,
    messages: [WELCOME],
    result: null,
  };
}

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: Conversation[] = raw ? JSON.parse(raw) : [];
      if (parsed.length === 0) {
        const c = newConversation(0);
        setConversations([c]);
        setActiveId(c.id);
      } else {
        setConversations(parsed);
        setActiveId(parsed[0].id);
      }
    } catch {
      const c = newConversation();
      setConversations([c]);
      setActiveId(c.id);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (conversations.length === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) ?? null;
  }, [conversations, activeId]);

  const handleNew = () => {
    setConversations((cs) => {
      const c = newConversation(cs.length);
      setActiveId(c.id);
      return [c, ...cs];
    });
  };

  const handleDelete = (id: string) => {
    setConversations((cs) => {
      const next = cs.filter((c) => c.id !== id);
      if (next.length === 0) {
        const c = newConversation(0);
        setActiveId(c.id);
        return [c];
      }
      if (id === activeId) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  const updateActive = (patch: Partial<Conversation>) => {
    setConversations((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, ...patch, updatedAt: Date.now() } : c)),
    );
  };

  const updateConversationResult = (id: string, result: GenerateResponse) => {
    setConversations((cs) =>
      cs.map((c) => (c.id === id ? { ...c, result, updatedAt: Date.now() } : c)),
    );
  };

  const updateActiveResult = (result: GenerateResponse) => {
    if (!activeId) return;
    updateConversationResult(activeId, result);
  };

  const renameConversation = (id: string, title: string) => {
    setConversations((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, title: title.trim() || "Untitled chat", updatedAt: Date.now() } : c,
      ),
    );
  };

  const val = useMemo(
    () => ({
      conversations,
      activeId,
      setActiveId,
      activeConversation,
      handleNew,
      handleDelete,
      updateActive,
      updateActiveResult,
      updateConversationResult,
      renameConversation,
      setConversations,
    }),
    [conversations, activeId, activeConversation],
  );

  return <DesignContext.Provider value={val}>{children}</DesignContext.Provider>;
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return ctx;
}
