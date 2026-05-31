import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, Loader2 } from "lucide-react";
import { useAssistant } from "../../hooks/useAssistant";
import { cn } from "@/lib/utils";

export function AIWidget() {
  const [open, setOpen] = useState(false);
  const { messages, sendMessage, isPending } = useAssistant();
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.72_0.13_220)] text-white shadow-float cursor-pointer"
        aria-label="Open AI"
      >
        <Bot className="h-6 w-6" />
        <span className="absolute -inset-1 -z-10 animate-pulse rounded-full bg-primary/20 blur" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] max-w-sm overflow-hidden rounded-2xl shadow-float border border-border/60"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-secondary/20">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" /> FlowPilot Assistant
              </div>
              <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-secondary cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2 p-4 text-sm max-h-[300px] overflow-y-auto">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                    m.role === "user" 
                      ? "ml-auto rounded-tr-md bg-primary/10 border border-primary/5" 
                      : "rounded-tl-md bg-secondary"
                  )}
                >
                  {m.text}
                </div>
              ))}
              {isPending && (
                <div className="rounded-2xl rounded-tl-md bg-secondary px-3 py-2 text-xs flex items-center gap-2 max-w-[85%] border border-border/40">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground animate-pulse">Thinking...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border/60 p-3 bg-secondary/10">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isPending}
                placeholder={isPending ? "FlowPilot is thinking..." : "Ask FlowPilot…"}
                className="flex-1 rounded-xl bg-secondary px-3 py-2 text-xs outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <button 
                type="submit"
                disabled={isPending}
                className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
