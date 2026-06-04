import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
  completed_at?: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  type: "Career" | "Health" | "Learning" | "Personal";
  status: "active" | "completed" | "paused";
  description?: string;
  progress?: number;
  target_date?: string;
  created_at: string;
  deleted_at?: string | null;
  milestones?: Milestone[];
}

export function useGoals({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  // 1. Fetch all goals
  const goalsQuery = useQuery<{ status: string; data: { goals: Goal[] } }>({
    queryKey: ["goals"],
    queryFn: () => api.get("/goals"),
    enabled,
    retry: 1, // Fail fast on error instead of retrying indefinitely, ensuring quick error UI presentation
  });

  const goals = goalsQuery.data?.data?.goals || [];

  // 2. Create goal
  const createGoalMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      type?: string;
      status?: string;
      description?: string;
      target_date?: string;
    }) => api.post("/goals", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 3. Update goal
  const updateGoalMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<Goal>) =>
      api.put(`/goals/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 4. Delete goal
  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 5. Regenerate roadmap milestones
  const regenerateRoadmapMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${id}/roadmap/regenerate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 6. Create milestone
  const createMilestoneMutation = useMutation({
    mutationFn: ({ goalId, title }: { goalId: string; title: string }) =>
      api.post(`/goals/${goalId}/milestones`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 7. Update milestone
  const updateMilestoneMutation = useMutation({
    mutationFn: ({
      goalId,
      milestoneId,
      ...payload
    }: {
      goalId: string;
      milestoneId: string;
      title?: string;
      completed?: boolean;
      order_index?: number;
    }) => api.put(`/goals/${goalId}/milestones/${milestoneId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 8. Delete milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
      api.delete(`/goals/${goalId}/milestones/${milestoneId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 9. Reorder milestones
  const reorderMilestonesMutation = useMutation({
    mutationFn: ({
      goalId,
      orders,
    }: {
      goalId: string;
      orders: { id: string; order_index: number }[];
    }) => api.put(`/goals/${goalId}/milestones/reorder`, { orders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  return {
    goals,
    isLoading: goalsQuery.isLoading,
    isError: goalsQuery.isError,
    error: goalsQuery.error,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    regenerateRoadmap: regenerateRoadmapMutation.mutateAsync,
    createMilestone: createMilestoneMutation.mutateAsync,
    updateMilestone: updateMilestoneMutation.mutateAsync,
    deleteMilestone: deleteMilestoneMutation.mutateAsync,
    reorderMilestones: reorderMilestonesMutation.mutateAsync,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isRegenerating: regenerateRoadmapMutation.isPending,
    isCreatingMilestone: createMilestoneMutation.isPending,
    isUpdatingMilestone: updateMilestoneMutation.isPending,
    isDeletingMilestone: deleteMilestoneMutation.isPending,
    isReorderingMilestones: reorderMilestonesMutation.isPending,
  };
}
