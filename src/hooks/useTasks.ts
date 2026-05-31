import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "doing" | "review" | "done";
  priority: "low" | "med" | "high";
  tag: string;
  color: string;
  due_date?: string;
  created_at: string;
}

export function useTasks() {
  const queryClient = useQueryClient();

  // 1. Query to fetch all tasks for user
  const tasksQuery = useQuery<{ status: string; data: { tasks: Task[] } }>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks"),
  });

  // Extract task list array
  const tasks = tasksQuery.data?.data?.tasks || [];

  // 2. Mutation to create a new task
  const createTaskMutation = useMutation({
    mutationFn: (newTask: Partial<Task>) => api.post("/tasks", newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // 3. Mutation to update a task (e.g. status transition, edits)
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<Task>) =>
      api.put(`/tasks/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // Invalidate dashboard/analytics queries as well since task statuses updated
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
    },
  });

  // 4. Mutation to delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
    },
  });

  return {
    tasks,
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}
