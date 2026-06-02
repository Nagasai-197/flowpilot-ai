import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ScheduleBlock {
  id: string;
  label: string;
  type: "focus" | "break" | "meeting" | "habit" | "routine";
  start_time: string; // ISO string
  end_time: string; // ISO string
  color: "lavender" | "mint" | "sky" | "peach";
}

export interface AIPlanResponse {
  schedule: ScheduleBlock[];
  recommendations: string[];
}

export function usePlanner(targetDate?: string) {
  const queryClient = useQueryClient();
  const dateStr = targetDate || new Date().toISOString().split("T")[0];

  // 1. Fetch current schedule blocks list
  const currentPlanQuery = useQuery<{ status: string; data: AIPlanResponse }>({
    queryKey: ["planner", dateStr],
    queryFn: () => api.get(`/planner/current?date=${dateStr}`),
  });

  const plan = currentPlanQuery.data?.data;
  const schedule = plan?.schedule || [];
  const recommendations = plan?.recommendations || [];

  // 2. Generate optimized daily plan
  const generatePlanMutation = useMutation({
    mutationFn: (
      arg?:
        | string
        | { targetDate?: string; preferredDeepWorkDuration?: number; breakDuration?: number },
    ) => {
      let target = dateStr;
      let preferredDeepWorkDuration: number | undefined;
      let breakDuration: number | undefined;

      if (typeof arg === "string") {
        target = arg;
      } else if (arg && typeof arg === "object") {
        target = arg.targetDate || dateStr;
        preferredDeepWorkDuration = arg.preferredDeepWorkDuration;
        breakDuration = arg.breakDuration;
      }

      return api.post("/planner/generate", {
        date: target,
        preferredDeepWorkDuration,
        breakDuration,
        currentTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  // 3. Create schedule block
  const createBlockMutation = useMutation({
    mutationFn: (newBlock: {
      title: string;
      block_type: string;
      start_time: string;
      end_time: string;
      color?: string;
    }) => api.post("/planner/blocks", newBlock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 4. Update schedule block
  const updateBlockMutation = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      title?: string;
      block_type?: string;
      start_time?: string;
      end_time?: string;
      color?: string;
    }) => api.put(`/planner/blocks/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 5. Delete schedule block
  const deleteBlockMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/planner/blocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 6. Regenerate single schedule block
  const regenerateBlockMutation = useMutation({
    mutationFn: (id: string) => api.post(`/planner/blocks/${id}/regenerate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  return {
    schedule,
    recommendations,
    isLoading: currentPlanQuery.isLoading,
    isError: currentPlanQuery.isError,
    error: currentPlanQuery.error,
    generatePlan: generatePlanMutation.mutate,
    createBlock: createBlockMutation.mutateAsync,
    updateBlock: updateBlockMutation.mutateAsync,
    deleteBlock: deleteBlockMutation.mutateAsync,
    regenerateBlock: regenerateBlockMutation.mutateAsync,
    isGenerating: generatePlanMutation.isPending,
    isCreatingBlock: createBlockMutation.isPending,
    isUpdatingBlock: updateBlockMutation.isPending,
    isDeletingBlock: deleteBlockMutation.isPending,
    isRegeneratingBlock: regenerateBlockMutation.isPending,
  };
}
