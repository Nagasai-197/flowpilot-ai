import { supabase } from '../lib/supabase.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getAIProvider } from '../providers/ai/index.js';

export class GoalService {
  /**
   * Fetch all active goals for a user
   */
  static async getGoalsForUser(userId: string) {
    logger.info(`GoalService.getGoalsForUser: Querying Supabase 'goals' table for user_id: ${userId}`);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(`GoalService.getGoalsForUser: Supabase query error: ${error.message} (code: ${error.code})`);
      throw new AppError(`Failed to fetch goals: ${error.message}`, 500);
    }

    logger.info(`GoalService.getGoalsForUser: Supabase returned ${data?.length || 0} rows`);
    return data || [];
  }

  /**
   * Creates a new goal config and automatically generates roadmap milestones using Gemini AI
   */
  static async createGoalForUser(userId: string, payload: { title: string; type?: string; status?: string; description?: string }) {
    let roadmapData: any = null;
    try {
      const ai = getAIProvider();
      const gen = await (ai as any).generateGoalRoadmap(payload.title, payload.description);
      const milestones = gen.milestones.map((m: any, idx: number) => ({
        id: `m-${Date.now()}-${idx}`,
        title: m.title,
        completed: false,
      }));
      roadmapData = {
        description: payload.description || '',
        milestones,
      };
    } catch (err) {
      logger.warn(`Failed to generate AI roadmap for goal: ${err}`);
      roadmapData = {
        description: payload.description || '',
        milestones: [],
      };
    }

    const insertPayload: Record<string, any> = {
      user_id: userId,
      title: payload.title,
      category: (payload.type || 'Personal').toLowerCase(),
      status: payload.status || 'active',
      progress: 0,
      description: JSON.stringify(roadmapData),
    };

    const { data, error } = await supabase
      .from('goals')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create goal: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Updates an existing goal and automatically calculates progress if milestones checklist changes
   */
  static async updateGoalForUser(
    goalId: string,
    userId: string,
    payload: { title?: string; type?: string; status?: string; description?: string; progress?: number }
  ) {
    // Verify ownership
    const { data: existing, error: existError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError('Goal not found');
    }

    const updatePayload: Record<string, any> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.type !== undefined) updatePayload.category = payload.type.toLowerCase();
    if (payload.status !== undefined) updatePayload.status = payload.status;
    
    if (payload.description !== undefined) {
      updatePayload.description = payload.description;
      try {
        const parsed = JSON.parse(payload.description);
        if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
          const completedCount = parsed.milestones.filter((m: any) => m.completed).length;
          updatePayload.progress = Math.round((completedCount / parsed.milestones.length) * 100);
          
          // Auto-mark completed if progress hits 100%
          if (updatePayload.progress === 100) {
            updatePayload.status = 'completed';
          } else if (payload.status === 'completed' || payload.status === undefined) {
            // Revert completed status if progress falls below 100%
            updatePayload.status = 'active';
          }
        }
      } catch (e) {
        // Fallback for raw text updates
        if (payload.progress !== undefined) updatePayload.progress = payload.progress;
      }
    } else {
      if (payload.progress !== undefined) updatePayload.progress = payload.progress;
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updatePayload)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update goal: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Regenerates a goal's milestones using Gemini AI
   */
  static async regenerateGoalRoadmap(goalId: string, userId: string) {
    const { data: existing, error: existError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError('Goal not found');
    }

    let userDescriptionText = '';
    try {
      const parsed = JSON.parse(existing.description || '');
      userDescriptionText = parsed.description || parsed.text || '';
    } catch (e) {
      userDescriptionText = existing.description || '';
    }

    // Call Gemini to generate a fresh milestones roadmap
    const ai = getAIProvider();
    const gen = await (ai as any).generateGoalRoadmap(existing.title, userDescriptionText);
    
    const milestones = gen.milestones.map((m: any, idx: number) => ({
      id: `m-${Date.now()}-${idx}`,
      title: m.title,
      completed: false,
    }));

    const roadmapData = {
      description: userDescriptionText,
      milestones,
    };

    const { data, error } = await supabase
      .from('goals')
      .update({
        description: JSON.stringify(roadmapData),
        progress: 0,
        status: 'active',
      })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to save regenerated roadmap: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Soft deletes a user goal (falls back to hard delete based on existing schema)
   */
  static async deleteGoalForUser(goalId: string, userId: string): Promise<void> {
    const { data: existing, error: existError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError('Goal not found');
    }

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete goal: ${error.message}`, 400);
    }
  }
}
