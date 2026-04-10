import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api";
import type { AiChatMessage } from "../types";

type Props = {
  /** Shown in the panel header only. */
  projectName?: string;
};

export function ProjectAiChatPanel({ projectName }: Props) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;

    const previous = messages;
    const nextMessages: AiChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const { reply } = await api.postAiChat({ messages: nextMessages });
      setMessages([
        ...nextMessages,
        { role: "assistant", content: reply?.trim() ? reply : "(no text)" },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat request failed.";
      toast.error(msg);
      setMessages(previous);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl border border-brick-700/50 bg-brick-900/40 flex flex-col h-[min(70vh,36rem)] lg:h-[min(80vh,42rem)] lg:sticky lg:top-6">
      <div className="p-4 border-b border-brick-700/40 shrink-0">
        <h2 className="text-base md:text-lg font-semibold text-brick-100">AI chat</h2>
        <p className="text-xs md:text-sm text-brick-400 mt-1">
          {projectName ? (
            <>
              Quick messages about <span className="text-brick-300">{projectName}</span>. History stays in
              this session.
            </>
          ) : (
            <>Quick messages — history stays in this session.</>
          )}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-brick-500">
            Ask a question or describe what you need. History stays in this session.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={
              m.role === "user"
                ? "ml-4 rounded-lg bg-brick-800/80 px-3 py-2 text-sm text-brick-100"
                : "mr-4 rounded-lg bg-brick-950/80 border border-brick-800/60 px-3 py-2 text-sm text-brick-200"
            }
          >
            <span className="text-[10px] uppercase tracking-wide text-brick-500 block mb-1">
              {m.role}
            </span>
            <div className="whitespace-pre-wrap wrap-break-word">{m.content}</div>
          </div>
        ))}
        {pending && <p className="text-xs text-brick-500 animate-pulse">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-brick-700/40 shrink-0 space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
          rows={3}
          disabled={pending}
          className="w-full rounded border border-brick-600 bg-brick-950 px-3 py-2 text-sm text-brick-100 placeholder:text-brick-600 resize-y min-h-18 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={pending || !input.trim()}
          className="w-full rounded bg-brick-600 hover:bg-brick-500 text-brick-50 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </section>
  );
}
