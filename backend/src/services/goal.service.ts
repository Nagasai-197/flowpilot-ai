import { supabase } from '../lib/supabase.js';
import { NotFoundError, AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

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
   * Creates a new goal config
   */
  static async createGoalForUser(userId: string, payload: { title: string; type?: string; status?: string; description?: string }) {
    const insertPayload: Record<string, any> = {
      user_id: userId,
      title: payload.title,
      category: (payload.type || 'Personal').toLowerCase(),
      status: payload.status || 'active',
      progress: 0,
    };
    if (payload.description !== undefined) insertPayload.description = payload.description;

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
   * Updates an existing goal
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
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.progress !== undefined) updatePayload.progress = payload.progress;

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
   * Soft deletes a user goal (falls back to hard delete based on existing schema)
   */
  static async deleteGoalForUser(goalId: string, userId: string): Promise<void> {
    // Check if the goal exists and is owned by the user first to yield accurate 404
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
