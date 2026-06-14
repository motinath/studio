import React, { useState, useEffect, useRef } from "react";
import { Search, X, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// Interface for searchable sections
export interface SearchItem {
  id: string;
  title: string;
  text: string;
}

// Popular quick links displayed by default in search
const QUICK_LINKS = [
  "Hello World",
  "Installation",
  "Using Python and QClang",
  "Onboarding Tutorial",
  "Language Blocks",
  "Compiler Pipeline",
  "Compilation Targets",
  "Superconducting Materials",
  "HFSS Electromagnetic Simulation",
  "Q3D Extractor Analysis",
  "EPR Analysis in Superconducting Quantum Circuits",
  "Simulation Dashboard Parameters",
  "Results, Verification, and Reports",
  "HFSS Result Parameter Analysis",
  "Q3D Result Parameter Analysis",
  "EPR / scQubits Result Parameter Analysis",
  "API Reference",
  "Integration",
  "Support",
  "Synthesis Tutorial",
];

// --- SEARCH MODAL COMPONENT ---
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchItems: SearchItem[];
  onNavigate: (hash: string) => void;
}

export function SearchModal({ isOpen, onClose, searchItems, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle key down for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();
  
  // Filter search items
  const results = cleanQuery
    ? searchItems.filter(
        (item) =>
          item.text.toLowerCase().includes(cleanQuery) ||
          item.title.toLowerCase().includes(cleanQuery)
      )
    : searchItems.filter((item) => QUICK_LINKS.includes(item.title));

  return (
    <div
      className="search-modal fixed inset-0 z-[9999] grid place-items-start center pt-[10vh] bg-[rgba(15,23,42,0.24)] backdrop-blur-xs overflow-y-auto p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="search-dialog w-full max-w-[760px] border border-[var(--line)] rounded-[20px] bg-[var(--panel)] shadow-[var(--shadow)] overflow-hidden max-h-[82vh] flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-head grid grid-template-columns-[1fr_auto] grid-cols-[1fr_auto] items-center border-b border-[var(--line)] bg-[var(--panel)]">
          <div className="flex items-center pl-4 w-full">
            <Search className="h-5 w-5 text-[var(--muted)] shrink-0" />
            <input
              ref={inputRef}
              id="searchInput"
              type="search"
              placeholder="Search documentation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border-0 outline-none bg-transparent text-[var(--text)] p-5 text-[20px] font-sans"
            />
          </div>
          <button
            onClick={onClose}
            className="search-close mr-4 border border-[var(--line)] rounded-xl bg-[#f8fafc] text-[var(--muted)] min-h-[38px] px-3.5 cursor-pointer font-sans text-[14px] hover:text-[var(--text)] hover:border-[#43c7d5]/45 transition-colors"
            type="button"
          >
            Esc
          </button>
        </div>

        <div className="search-results flex-1 overflow-y-auto p-3.5 bg-[#f8fafc] min-h-[260px] max-h-[520px] space-y-2.5">
          {results.length === 0 ? (
            <div className="search-empty grid gap-2 place-content-center min-h-[220px] p-6 text-center text-[var(--muted)]">
              <strong className="text-[var(--text)] text-[18px]">No matching topic found</strong>
              <span className="max-w-[460px] text-[15px]">
                Try searching for compiler, qubit, QAOA, syntax, DRC, target, or integration.
              </span>
            </div>
          ) : (
            <>
              <div className="search-hint px-1 py-0.5 text-[var(--accent)] text-[13px] font-bold uppercase tracking-wider">
                {cleanQuery ? `${results.length} matching topic${results.length === 1 ? "" : "s"}` : "Popular topics"}
              </div>
              {results.map((item) => {
                const snippet = item.text
                  .replace(item.title, "")
                  .trim()
                  .slice(0, 210);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(`#${item.id}`);
                      onClose();
                    }}
                    className="search-result w-full flex flex-col gap-1 rounded-[14px] border border-[var(--line)] bg-white p-3.5 text-left text-[var(--muted)] hover:bg-[#43c7d5]/10 hover:border-[#43c7d5]/35 transition-all cursor-pointer"
                  >
                    <strong className="text-[var(--text)] text-[17px] font-bold block">
                      {item.title}
                    </strong>
                    <span className="text-sm leading-relaxed">
                      {snippet}...
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- ASSISTANT MODAL COMPONENT ---
interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  title?: string;
  sources?: { id: string; title: string }[];
  suggestions?: string[];
}

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchItems: SearchItem[];
  onNavigate: (hash: string) => void;
}

export function AssistantModal({ isOpen, onClose, searchItems, onNavigate }: AssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Ask me about Josephson junctions, HFSS simulations, python routing, or kinetic inductance.",
      title: "How can I help you compile or design today?",
      suggestions: [
        "How to compile a hello world chip?",
        "What are transmon design rules?",
        "Compare aluminum and niobium",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle key down for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const findAssistantMatches = (question: string) => {
    const words = question
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((word) => word.length > 2);

    return searchItems
      .map((item) => {
        const haystack = `${item.title} ${item.text}`.toLowerCase();
        const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const getAnswer = (question: string): Message => {
    const lower = question.toLowerCase();
    let matches: SearchItem[] = findAssistantMatches(question);

    // Rule-based filters matching app.js
    if (lower.includes("install") || lower.includes("setup") || lower.includes("start")) {
      matches = searchItems.filter((item) => ["installation", "using-python", "getting-started"].includes(item.id)).slice(0, 3);
    } else if (lower.includes("compile") || lower.includes("compiler") || lower.includes("workflow")) {
      matches = searchItems.filter((item) => ["compiler-reference", "using-python", "synthesis-tutorial"].includes(item.id)).slice(0, 3);
    } else if (lower.includes("api") || lower.includes("endpoint") || lower.includes("parse")) {
      matches = searchItems.filter((item) => ["api-reference", "execution-part-1", "execution-part-2"].includes(item.id)).slice(0, 3);
    } else if (
      lower.includes("material") ||
      lower.includes("aluminum") ||
      lower.includes("niobium") ||
      lower.includes("sapphire") ||
      lower.includes("alox") ||
      lower.includes("tin")
    ) {
      matches = searchItems.filter((item) => ["superconducting-materials", "chip-synthesis", "hfss-tutorial"].includes(item.id)).slice(0, 3);
    } else if (lower.includes("hfss") || lower.includes("electromagnetic") || lower.includes("eigenmode")) {
      matches = searchItems.filter((item) => ["hfss-results-analysis", "hfss-tutorial", "simulation-dashboard"].includes(item.id)).slice(0, 3);
    } else if (lower.includes("q3d") || lower.includes("capacitance") || lower.includes("matrix")) {
      matches = searchItems.filter((item) => ["q3d-results-analysis", "q3d-tutorial", "design-rules"].includes(item.id)).slice(0, 3);
    } else if (
      lower.includes("epr") ||
      lower.includes("scqubits") ||
      lower.includes("energy") ||
      lower.includes("hamiltonian")
    ) {
      matches = searchItems.filter((item) => ["epr-results-analysis", "epr-tutorial", "results-reports"].includes(item.id)).slice(0, 3);
    } else if (lower.includes("integrat") || lower.includes("frontend") || lower.includes("backend")) {
      matches = searchItems.filter((item) => ["integration", "api-reference", "user-guide"].includes(item.id)).slice(0, 3);
    }

    if (!matches.length) {
      matches = searchItems.slice(0, 3);
    }

    const first = matches[0];
    const snippet = first.text.replace(first.title, "").trim().slice(0, 320);

    return {
      id: `bot-${Date.now()}`,
      role: "bot",
      title: first.title,
      content: `${snippet}... For your QClang documentation, the best next step is to open the matched topic and follow the command or explanation shown there.`,
      sources: matches.map((m) => ({ id: m.id, title: m.title })),
    };
  };

  const handleSend = (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate bot thinking response
    setTimeout(() => {
      const botAnswer = getAnswer(cleanText);
      setMessages((prev) => [...prev, botAnswer]);
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div
      className="assistant-modal fixed inset-0 z-[10000] grid place-items-end center bg-[rgba(15,23,42,0.24)] backdrop-blur-xs p-6"
      onClick={onClose}
    >
      <div
        className="assistant-panel w-full max-w-[900px] border border-[var(--line)] rounded-[20px] bg-[var(--panel)] shadow-[var(--shadow)] overflow-hidden max-h-[86vh] grid grid-rows-[auto_1fr_auto_auto] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="assistant-head flex items-center justify-between gap-5 p-5 border-b border-[var(--line)] bg-[var(--panel)]">
          <div>
            <span className="assistant-kicker block text-[var(--accent)] text-[13px] font-bold uppercase tracking-wider">
              QClang AI Bot
            </span>
            <h2 className="m-0 mt-0.5 text-2xl font-bold text-[var(--text)] leading-tight">
              Documentation Assistant
            </h2>
          </div>
          <button
            onClick={onClose}
            className="assistant-close border border-[var(--line)] rounded-xl bg-[#f8fafc] text-[var(--muted)] min-h-[42px] px-4 cursor-pointer font-sans text-sm hover:text-[var(--text)] hover:border-[#43c7d5]/45 transition-colors"
            type="button"
          >
            Close
          </button>
        </div>

        <div
          ref={scrollRef}
          className="assistant-messages flex flex-col gap-4 overflow-y-auto p-5 bg-[#f8fafc] min-h-[260px]"
        >
          {messages.map((msg) => (
            <article
              key={msg.id}
              className={cn(
                "assistant-message w-fit max-w-[min(680px,100%)] border border-[var(--line)] rounded-2xl p-4 text-[var(--muted)] text-[15px] leading-relaxed",
                msg.role === "user"
                  ? "assistant-message-user justify-self-end self-end bg-[#43c7d3]/12 text-[var(--text)]"
                  : "assistant-message-bot justify-self-start self-start bg-white shadow-sm"
              )}
            >
              {msg.title && (
                <strong className="block text-[var(--text)] text-[16px] mb-1 font-bold">
                  {msg.title}
                </strong>
              )}
              <p className={cn("m-0 text-sm leading-relaxed", msg.title ? "mt-1.5" : "")}>
                {msg.content}
              </p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="assistant-sources flex flex-wrap gap-2 mt-3.5">
                  {msg.sources.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => {
                        onNavigate(`#${src.id}`);
                        onClose();
                      }}
                      className="assistant-source border border-[#43c7d3]/30 rounded-full bg-[#43c7d3]/8 text-[var(--accent)] px-2.5 py-1.5 cursor-pointer font-sans text-xs font-semibold hover:text-[var(--text)] hover:border-[#43c7d3]/50 transition-colors"
                      type="button"
                    >
                      {src.title}
                    </button>
                  ))}
                </div>
              )}

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="assistant-suggestions flex flex-wrap gap-2 mt-3.5 border-t border-[var(--line)] pt-3.5">
                  {msg.suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug)}
                      className="assistant-suggestion border border-[var(--line)] rounded-full bg-white text-[var(--muted)] px-3.5 py-2 cursor-pointer font-sans text-sm font-semibold hover:text-[var(--text)] hover:border-[#43c7d3]/50 transition-colors shadow-xs"
                      type="button"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="assistant-form grid grid-cols-[1fr_auto] gap-2.5 p-4 bg-white border-t border-[var(--line)]"
        >
          <input
            ref={inputRef}
            id="assistantInput"
            type="text"
            autoComplete="off"
            placeholder="Ask a question about QClang..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border border-[var(--line)] rounded-xl bg-white text-[var(--text)] outline-none p-3.5 font-sans focus:border-[#43c7d3]/55 transition-colors"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 border border-[#43c7d3]/38 rounded-xl bg-[#43c7d3]/12 text-[var(--text)] px-4.5 cursor-pointer font-sans hover:bg-[#43c7d3]/20 transition-colors font-semibold"
          >
            <Send className="h-4 w-4 shrink-0" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
