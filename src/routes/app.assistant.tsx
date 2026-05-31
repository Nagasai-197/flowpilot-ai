import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Mic, Paperclip, Loader2, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAssistant } from "../hooks/useAssistant";

// Let's import framer-motion correctly
import { motion as motionFramer, AnimatePresence as AnimatePresenceFramer } from "framer-motion";

export const Route = createFileRoute("/app/assistant")({
  component: Assistant,
});

const prompts = [
  "Plan my afternoon focus sessions",
  "How many tasks are due today?",
  "Optimize my schedule to protect deep work",
  "Assess my consistency stats",
  "Draft a custom daily outline",
];

function Assistant() {
  const { messages, sendMessage, confirmAction, cancelAction, isPending, clearHistory } = useAssistant();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handlePromptClick = (p: string) => {
    if (isPending) return;
    sendMessage(p);
  };

  // Scroll smoothly to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Your calm, intelligent co-pilot.</p>
        </div>
        <button 
          onClick={clearHistory}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 cursor-pointer"
          title="Clear local chat window history"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-4">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <motionFramer.div
              key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "ai" && (
                  <div className="mr-3 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.72_0.13_220)] text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                  ${m.role === "user" ? "rounded-tr-md bg-foreground text-background" : "rounded-tl-md bg-secondary"}`}>
                  {m.text}
                  
                  {/* Action Confirmation Panel inside thread */}
                  {m.action && m.action.requiresConfirmation && (
                    <div className="mt-3 rounded-2xl border border-border/80 bg-background/50 p-4 backdrop-blur-md shadow-soft max-w-[400px]">
                      <div className="flex items-start gap-2.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Workspace Action Required</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.action.type === "delete_task" && `Delete task '${m.action.payload?.title || "selected task"}'?`}
                            {m.action.type === "complete_task" && `Mark task '${m.action.payload?.title || "selected task"}' as completed?`}
                            {m.action.type === "delete_habit" && `Delete habit '${m.action.payload?.name || "selected habit"}'?`}
                            {m.action.type === "delete_goal" && `Delete goal '${m.action.payload?.title || "selected goal"}'?`}
                          </p>
                        </div>
                      </div>
                      
                      {!m.actionExecuted ? (
                        <div className="mt-4 flex gap-2 justify-end">
                          <button
                            onClick={() => cancelAction(i)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => confirmAction(i, m.action!)}
                            className="rounded-lg bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 font-semibold cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs flex items-center gap-1.5 font-semibold text-muted-foreground">
                          {m.actionExecuted === "confirmed" ? (
                            <span className="text-green-500">✓ Action Confirmed & Executed</span>
                          ) : (
                            <span className="text-red-500">✗ Action Cancelled</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motionFramer.div>
          ))}
          
          {/* Thinking / Typing state */}
          <AnimatePresenceFramer>
            {isPending && (
              <motionFramer.div 
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.72_0.13_220)] text-white">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-secondary px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">FlowPilot is thinking...</span>
                </div>
              </motionFramer.div>
            )}
          </AnimatePresenceFramer>
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1 max-h-[80px]">
        {prompts.map((p) => (
          <button key={p} onClick={() => handlePromptClick(p)} disabled={isPending}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-60 cursor-pointer">
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSend}
        className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft"
      >
        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer">
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          placeholder={isPending ? "Waiting for response..." : "Ask FlowPilot anything…"}
          className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer">
          <Mic className="h-4 w-4" />
        </button>
        <button 
          type="submit" 
          disabled={isPending}
          className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
