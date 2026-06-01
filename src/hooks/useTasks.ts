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
  position?: number;
  created_at: string;
  updated_at?: string;
}

const TASKS_QUERY_KEY = ["tasks"] as const;

export function useTasks() {
  const queryClient = useQueryClient();

  // 1. Query to fetch all tasks for user
  const tasksQuery = useQuery<{ status: string; data: { tasks: Task[] } }>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: () => api.get("/tasks"),
  });

  // Extract task list array
  const tasks = tasksQuery.data?.data?.tasks || [];

  // 2. Mutation to create a new task
  const createTaskMutation = useMutation({
    mutationFn: (newTask: Partial<Task>) => api.post("/tasks", newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  // 3. Mutation to update a task (e.g. status transition, edits)
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<Task>) =>
      api.put(`/tasks/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      // Invalidate dashboard/analytics queries as well since task statuses updated
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
  });

  // 4. Dedicated drag-and-drop move mutation — optimistic friendly
  //    Callers handle their own optimistic setQueryData before calling this.
  const moveTaskMutation = useMutation({
    mutationFn: ({
      id,
      status,
      position,
    }: {
      id: string;
      status: Task["status"];
      position: number;
    }) => api.put(`/tasks/${id}`, { status, position }),
    onSuccess: () => {
      // Soft re-fetch in the background to reconcile any server-side changes
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["copilot"] });
    },
    onError: () => {
      // On failure, invalidate to get the real server state back
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  // 5. Mutation to delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
    },
  });

  /**
   * Optimistically update the task list in the query cache.
   * Call this from drag-and-drop handlers before hitting the server.
   */
  function setTasksOptimistic(updater: (prev: Task[]) => Task[]) {
    queryClient.setQueryData<{ status: string; data: { tasks: Task[] } }>(
      TASKS_QUERY_KEY,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            tasks: updater(old.data.tasks),
          },
        };
      }
    );
  }

  return {
    tasks,
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    error: tasksQuery.error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    moveTask: moveTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    setTasksOptimistic,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}
