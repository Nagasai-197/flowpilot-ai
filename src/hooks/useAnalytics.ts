import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface DashboardStats {
  productivityScore: number;
  tasksToday: string; // e.g. "14/18"
  tasksDonePercentage: number; // e.g. 78
  habitConsistency: string; // e.g. "91%"
  currentStreak: string; // e.g. "12d"
}

export interface TrendData {
  d: string; // Day of month, e.g. "27"
  score: number;
  focus: number;
}

export interface HeatmapData {
  i: number; // index (0 to 83)
  v: number; // productivity value score (intensity)
  date: string; // YYYY-MM-DD
}

export function useAnalytics() {
  const localDate = new Date().toLocaleDateString('en-CA');

  // 1. Fetch dashboard metrics
  const dashboardQuery = useQuery<{ status: string; data: DashboardStats }>({
    queryKey: ["analytics", "dashboard", localDate],
    queryFn: () => api.get(`/analytics/dashboard?localDate=${localDate}`),
  });

  // 2. Fetch 14-day trend history
  const trendQuery = useQuery<{ status: string; data: { trend: TrendData[] } }>({
    queryKey: ["analytics", "trend", localDate],
    queryFn: () => api.get(`/analytics/trend?localDate=${localDate}`),
  });

  // 3. Fetch 12-week heatmap history
  const heatmapQuery = useQuery<{ status: string; data: { heatmap: HeatmapData[] } }>({
    queryKey: ["analytics", "heatmap", localDate],
    queryFn: () => api.get(`/analytics/heatmap?localDate=${localDate}`),
  });

  const dashboardStats = dashboardQuery.data?.data;
  const trendData = trendQuery.data?.data?.trend || [];
  const heatmapData = heatmapQuery.data?.data?.heatmap || [];

  const isLoading = dashboardQuery.isLoading || trendQuery.isLoading || heatmapQuery.isLoading;
  const isError = dashboardQuery.isError || trendQuery.isError || heatmapQuery.isError;

  return {
    dashboardStats,
    trendData,
    heatmapData,
    isLoading,
    isError,
    refetchAll: () => {
      dashboardQuery.refetch();
      trendQuery.refetch();
      heatmapQuery.refetch();
    },
  };
}
