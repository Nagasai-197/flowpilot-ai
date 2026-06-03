export interface AIPlanRequest {
  tasks: any[];
  habits: any[];
  workingHoursStart: string;
  workingHoursEnd: string;
  dateStr: string;
  preferredDeepWorkDuration?: number;
  breakDuration?: number;
  offsetStr?: string;
  events?: any[];
}

export interface AIScheduleBlock {
  label: string;
  type: "focus" | "break" | "meeting" | "habit";
  start_time: string; // ISO 8601 string
  end_time: string; // ISO 8601 string
  color: "lavender" | "mint" | "sky" | "peach";
}

export interface AIPlanResponse {
  schedule: AIScheduleBlock[];
  recommendations: string[];
}

export interface AIAssistantRequest {
  message: string;
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  context: {
    tasksSummary: string;
    habitsSummary: string;
    scheduleSummary: string;
    analyticsSummary: string;
    workingHours: string;
  };
}

export interface AIAssistantResponse {
  text: string;
  message?: string; // friendly duplicate mapping for Part 4 JSON compatibility
  action?: {
    type:
      | "reschedule_plan"
      | "create_task"
      | "toggle_habit"
      | "none"
      | "create_goal"
      | "complete_goal"
      | "delete_goal"
      | "show_goals"
      | "show_schedule"
      | "show_analytics"
      | "move_block"
      | "regenerate_plan";
    requiresConfirmation?: boolean;
    payload?: Record<string, any>;
  };
}

export interface AIProvider {
  generateSchedulePlan(request: AIPlanRequest): Promise<AIPlanResponse>;
  askAssistant(request: AIAssistantRequest): Promise<AIAssistantResponse>;
  generateGoalRoadmap(
    goalTitle: string,
    goalDescription?: string,
  ): Promise<{ milestones: { title: string; completed: boolean }[] }>;
  regenerateSingleBlock(
    blockTitle: string,
    blockType: string,
    durationMinutes: number,
  ): Promise<{ title: string; block_type: string; color: string; rationale: string }>;
}
