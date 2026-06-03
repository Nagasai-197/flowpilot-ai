import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

export interface Message {
  role: "user" | "ai";
  text: string;
  action?: AIAssistantAction;
  actionExecuted?: "confirmed" | "cancelled" | null;
}

export interface AIAssistantAction {
  type:
    | "reschedule_plan"
    | "create_task"
    | "update_task"
    | "delete_task"
    | "complete_task"
    | "create_habit"
    | "update_habit"
    | "delete_habit"
    | "create_goal"
    | "complete_goal"
    | "delete_goal"
    | "show_goals"
    | "show_schedule"
    | "show_analytics"
    | "move_block"
    | "regenerate_plan"
    | "none";
  requiresConfirmation?: boolean;
  payload?: Record<string, any>;
}

export interface AIAssistantResponse {
  text: string;
  message?: string;
  action?: AIAssistantAction;
}

export function useAssistant() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Good morning! I am FlowPilot, your empathetic productivity assistant. How can I help you optimize your schedule or track your consistency today?",
    },
  ]);

  const executeImmediateAction = async (action: AIAssistantAction) => {
    try {
      if (action.type === "create_task") {
        await api.post("/tasks", action.payload);
        toast.success(`Task '${action.payload?.title}' created successfully! 📝`);
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["copilot"] });
      } else if (action.type === "create_habit") {
        await api.post("/habits", action.payload);
        toast.success(`Habit '${action.payload?.name}' created successfully! 🍏`);
        queryClient.invalidateQueries({ queryKey: ["habits"] });
        queryClient.invalidateQueries({ queryKey: ["copilot"] });
      } else if (action.type === "create_goal") {
        try {
          await api.post("/goals", action.payload);
          toast.success(`Goal '${action.payload?.title}' created successfully! 🎯`);
          queryClient.invalidateQueries({ queryKey: ["copilot"] });
        } catch (e) {
          toast.error("Goal creation failed. Please try again after refreshing the workspace.");
        }
      } else if (action.type === "regenerate_plan") {
        toast.loading("Re-optimizing your schedule...");
        await api.post("/planner/generate");
        toast.dismiss();
        toast.success("AI Planner schedule optimized successfully! 📅");
        queryClient.invalidateQueries({ queryKey: ["planner"] });
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Action execution failed: ${err.message}`);
    }
  };

  const chatMutation = useMutation<
    { status: string; data: AIAssistantResponse },
    Error,
    { message: string; events?: any[] }
  >({
    mutationFn: (payload) => api.post("/assistant/chat", payload),
    onSuccess: (res, variables) => {
      const text = res.data.text || res.data.message || "I could not compile a response.";
      const action = res.data.action;

      // Append user message and AI reply together
      setMessages((prev) => [
        ...prev,
        { role: "user", text: variables.message },
        { role: "ai", text, action },
      ]);

      // If the AI Assistant triggered an immediate action, run it
      if (action && !action.requiresConfirmation) {
        executeImmediateAction(action);
      }
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const events = JSON.parse(localStorage.getItem("fp_events") || "[]");
    chatMutation.mutate({ message: text, events });
  };

  const confirmAction = async (msgIndex: number, action: AIAssistantAction) => {
    try {
      toast.loading("Executing action...");

      if (action.type === "delete_task" && action.payload?.id) {
        await api.delete(`/tasks/${action.payload.id}`);
        toast.dismiss();
        toast.success("Task deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["copilot"] });
      } else if (action.type === "complete_task" && action.payload?.id) {
        await api.put(`/tasks/${action.payload.id}`, { status: "done" });
        toast.dismiss();
        toast.success("Task marked as completed! 🎉");
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["copilot"] });
      } else if (action.type === "delete_habit" && action.payload?.id) {
        await api.delete(`/habits/${action.payload.id}`);
        toast.dismiss();
        toast.success("Habit deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["habits"] });
        queryClient.invalidateQueries({ queryKey: ["copilot"] });
      } else if (action.type === "delete_goal" && action.payload?.id) {
        try {
          await api.delete(`/goals/${action.payload.id}`);
          toast.dismiss();
          toast.success("Goal deleted successfully!");
          queryClient.invalidateQueries({ queryKey: ["copilot"] });
        } catch (e) {
          toast.dismiss();
          toast.error("Goal deletion failed. Please refresh and try again.");
        }
      }

      // Mark action as confirmed in conversational state
      setMessages((prev) => {
        const nextMsgs = [...prev];
        if (nextMsgs[msgIndex]) {
          nextMsgs[msgIndex] = {
            ...nextMsgs[msgIndex],
            actionExecuted: "confirmed",
          };
        }
        return nextMsgs;
      });
    } catch (err: any) {
      toast.dismiss();
      toast.error(`Execution error: ${err.message}`);
    }
  };

  const cancelAction = (msgIndex: number) => {
    setMessages((prev) => {
      const nextMsgs = [...prev];
      if (nextMsgs[msgIndex]) {
        nextMsgs[msgIndex] = {
          ...nextMsgs[msgIndex],
          actionExecuted: "cancelled",
        };
      }
      return nextMsgs;
    });
    toast.info("Action cancelled by pilot.");
  };

  return {
    messages,
    sendMessage,
    confirmAction,
    cancelAction,
    isPending: chatMutation.isPending,
    isError: chatMutation.isError,
    error: chatMutation.error,
    clearHistory: () =>
      setMessages([
        {
          role: "ai",
          text: "Good morning! I am FlowPilot, your empathetic productivity assistant. How can I help you optimize your schedule or track your consistency today?",
        },
      ]),
  };
}
