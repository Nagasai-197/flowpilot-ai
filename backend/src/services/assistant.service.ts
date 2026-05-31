import { supabase } from '../lib/supabase.js';
import { getAIProvider, AIAssistantResponse } from '../providers/ai/index.js';
import { ContextBuilder } from '../utils/contextBuilder.js';
import { AssistantIntentClassifier } from '../utils/intentClassifier.js';
import { TaskService } from './task.service.js';
import { HabitService } from './habit.service.js';
import { AnalyticsService } from './analytics.service.js';
import { AppError } from '../utils/errors.js';
import { AssistantSessionMemory } from '../utils/sessionMemory.js';

export class AssistantService {
  /**
   * Orchestrates conversation chat processing with real database contexts
   */
  static async processChat(
    userId: string,
    message: string,
    _history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
  ): Promise<AIAssistantResponse> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch Profile configuration settings for time zones
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('working_hours_start, working_hours_end, timezone')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new AppError(`Failed to fetch user settings: ${profileError.message}`, 500);
      }

      const timezone = profile?.timezone || 'UTC';
      const workingHoursStart = profile?.working_hours_start || '09:00:00';
      const workingHoursEnd = profile?.working_hours_end || '17:00:00';

      // 2. Fetch User Tasks, Habits, today's schedule, and dashboard focus statistics
      const tasks = await TaskService.getTasksForUser(userId);
      const habits = await HabitService.getHabitsForUser(userId);
      
      const { data: blocks } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', `${todayStr}T00:00:00Z`)
        .lte('start_time', `${todayStr}T23:59:59Z`)
        .order('start_time', { ascending: true });

      const stats = await AnalyticsService.getDashboardStats(userId);

      // Fetch goals (wrapped in try-catch in case goals table doesn't exist yet)
      let goals: any[] = [];
      try {
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId);
        goals = (goalsData || []).map(g => ({
          ...g,
          type: g.category ? (g.category.charAt(0).toUpperCase() + g.category.slice(1)) : 'Personal'
        }));
      } catch (err: any) {
        // ignore
      }

      // 3. Run Intent Classification Guard
      const intent = AssistantIntentClassifier.classify(message);

      // 4. Try Local Intercept zero-token resolution
      const localResponse = AssistantIntentClassifier.handleLocally(message, intent, {
        tasks,
        habits,
        schedule: blocks || [],
        stats,
        goals,
      });

      if (localResponse) {
        return localResponse; // returns instantly, bypassing LLM costs completely!
      }

      // 5. Fallback: Compress full database arrays into compact summaries using ContextBuilder
      const compressedContext = ContextBuilder.build(
        tasks,
        habits,
        blocks || [],
        stats,
        { workingHoursStart, workingHoursEnd, timezone },
        todayStr,
        goals   // ← goals are now first-class in the context
      );

      // Fetch, append user prompt and update planner summary in session memory
      const userMemory = AssistantSessionMemory.getMemory(userId);
      AssistantSessionMemory.appendMessage(userId, 'user', message);
      AssistantSessionMemory.updatePlannerSummary(userId, compressedContext.scheduleSummary);

      // Format history array matching AIAssistantRequest
      const formattedHistory = userMemory.messages.slice(0, -1).map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      // 6. Request conversational reply via swappable AI provider
      const provider = getAIProvider();
      const aiReply = await provider.askAssistant({
        message,
        history: formattedHistory,
        context: compressedContext,
      });

      // Append assistant response to session memory
      AssistantSessionMemory.appendMessage(userId, 'model', aiReply.text);

      return aiReply;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Assistant process execution failed: ${err.message}`, 500);
    }
  }
}
