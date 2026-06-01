import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  type: "Career" | "Health" | "Learning" | "Personal";
  status: "active" | "completed" | "paused";
  description?: string;
  progress?: number;
  created_at: string;
  deleted_at?: string | null;
}

export function useGoals() {
  const queryClient = useQueryClient();

  // 1. Fetch all goals
  const goalsQuery = useQuery<{ status: string; data: { goals: Goal[] } }>({
    queryKey: ["goals"],
    queryFn: () => api.get("/goals"),
    retry: 1, // Fail fast on error instead of retrying indefinitely, ensuring quick error UI presentation
  });

  const goals = goalsQuery.data?.data?.goals || [];

  // 2. Create goal
  const createGoalMutation = useMutation({
    mutationFn: (payload: { title: string; type?: string; status?: string; description?: string }) =>
      api.post("/goals", payload),
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

  return {
    goals,
    isLoading: goalsQuery.isLoading,
    isError: goalsQuery.isError,
    error: goalsQuery.error,
    createGoal: createGoalMutation.mutate,
    updateGoal: updateGoalMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,
    regenerateRoadmap: regenerateRoadmapMutation.mutate,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isRegenerating: regenerateRoadmapMutation.isPending,
  };
}
