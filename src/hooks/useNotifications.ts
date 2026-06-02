import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  is_read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  // 1. Fetch user notifications list & unread badge count
  const notificationsQuery = useQuery<{
    status: string;
    unreadCount: number;
    data: { notifications: Notification[] };
  }>({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications"),
    // Refresh every 60s to pick up server-generated notifications
    refetchInterval: 60_000,
  });

  const notifications = notificationsQuery.data?.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  // 2. Run the rule engine to generate fresh notifications
  const generateMutation = useMutation({
    mutationFn: () => api.post("/notifications/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 3. Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 4. Delete single notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 5. Clear all notifications history
  const clearAllMutation = useMutation({
    mutationFn: () => api.post("/notifications/clear"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
    generateNotifications: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAll: clearAllMutation.mutate,
    isMarking: markAsReadMutation.isPending,
    isClearing: clearAllMutation.isPending,
  };
}
