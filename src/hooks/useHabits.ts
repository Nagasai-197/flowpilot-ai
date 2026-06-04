import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Habit {
  id: string;
  name: string;
  color: string;
  streak: number;
  pct: number;
  days: number[]; // 7-day checklist array containing 1s and 0s
}

export function useHabits({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const localDate = new Date().toLocaleDateString("en-CA");

  // 1. Query to fetch habits
  const habitsQuery = useQuery<{ status: string; data: { habits: Habit[] } }>({
    queryKey: ["habits", localDate],
    queryFn: () => api.get(`/habits?localDate=${localDate}`),
    enabled,
  });

  const habits = habitsQuery.data?.data?.habits || [];

  // 2. Mutation to create a new habit configuration
  const createHabitMutation = useMutation({
    mutationFn: (newHabit: { name: string; color?: string }) => api.post("/habits", newHabit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  // 3. Mutation to update a habit (name and/or color)
  const updateHabitMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; color?: string }) =>
      api.put(`/habits/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  // 4. Mutation to toggle a daily habit log check-in
  const toggleHabitMutation = useMutation({
    mutationFn: ({ id, date, completed }: { id: string; date: string; completed: boolean }) =>
      api.post(`/habits/${id}/toggle`, { date, completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
    },
  });

  // 4. Mutation to delete a habit
  const deleteHabitMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/habits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return {
    habits,
    isLoading: habitsQuery.isLoading,
    isError: habitsQuery.isError,
    error: habitsQuery.error,
    createHabit: createHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    toggleHabit: toggleHabitMutation.mutateAsync,
    deleteHabit: deleteHabitMutation.mutateAsync,
    isCreating: createHabitMutation.isPending,
    isUpdating: updateHabitMutation.isPending,
    isToggling: toggleHabitMutation.isPending,
    isDeleting: deleteHabitMutation.isPending,
  };
}
