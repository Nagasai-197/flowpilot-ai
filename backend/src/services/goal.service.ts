import { supabase } from "../lib/supabase.js";
import { NotFoundError, AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { getAIProvider } from "../providers/ai/index.js";

export class GoalService {
  /**
   * Fetch all active goals for a user
   */
  static async getGoalsForUser(userId: string) {
    logger.info(
      `GoalService.getGoalsForUser: Querying Supabase 'goals' table for user_id: ${userId}`,
    );
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(
        `GoalService.getGoalsForUser: Supabase query error: ${error.message} (code: ${error.code})`,
      );
      throw new AppError(`Failed to fetch goals: ${error.message}`, 500);
    }

    logger.info(`GoalService.getGoalsForUser: Supabase returned ${data?.length || 0} rows`);
    return data || [];
  }

  /**
   * Recalculates goal progress dynamically based on completed milestones
   */
  static async recalculateGoalProgress(goalId: string, userId: string): Promise<any> {
    // 1. Fetch all milestones for this goal
    const { data: milestones, error: milesError } = await supabase
      .from("goal_milestones")
      .select("completed")
      .eq("goal_id", goalId);

    if (milesError) {
      throw new AppError(
        `Failed to fetch milestones for progress recalculation: ${milesError.message}`,
        500,
      );
    }

    let progress = 0;
    if (milestones && milestones.length > 0) {
      const completedCount = milestones.filter((m: any) => m.completed).length;
      progress = Math.round((completedCount / milestones.length) * 100);
    }

    // 2. Set status automatically based on progress
    let status = "active";
    if (progress === 100) {
      status = "completed";
    }

    // 3. Update parent goal progress & status
    const { data: updatedGoal, error: updateError } = await supabase
      .from("goals")
      .update({ progress, status })
      .eq("id", goalId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(`Failed to sync goal progress: ${updateError.message}`, 400);
    }

    return updatedGoal;
  }

  /**
   * Creates a new goal config and automatically generates roadmap milestones using Gemini AI
   */
  static async createGoalForUser(
    userId: string,
    payload: {
      title: string;
      type?: string;
      status?: string;
      description?: string;
      target_date?: string;
    },
  ) {
    // 1. Insert the parent goal first with standard description text
    const insertPayload: Record<string, any> = {
      user_id: userId,
      title: payload.title,
      category: (payload.type || "Personal").toLowerCase(),
      status: payload.status || "active",
      progress: 0,
      description: payload.description || "", // Standard text description
    };
    if (payload.target_date !== undefined) {
      insertPayload.target_date = payload.target_date;
    }

    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .insert(insertPayload)
      .select()
      .single();

    if (goalError || !goal) {
      throw new AppError(`Failed to create goal: ${goalError?.message || "Unknown error"}`, 400);
    }

    // 2. Generate roadmap milestones with Gemini AI
    let generatedMilestones: { title: string; completed: boolean }[] = [];
    try {
      const ai = getAIProvider();
      const gen = await (ai as any).generateGoalRoadmap(payload.title, payload.description);
      generatedMilestones = gen.milestones || [];
    } catch (err) {
      logger.warn(
        `Failed to generate AI roadmap for goal ${goal.id}: ${err}. Falling back to empty milestones.`,
      );
    }

    // 3. Insert milestones as separate rows in 'goal_milestones' table
    if (generatedMilestones.length > 0) {
      const milestonesToInsert = generatedMilestones.map((m: any, idx: number) => ({
        goal_id: goal.id,
        title: m.title,
        completed: false,
        order_index: idx,
      }));

      const { error: insertError } = await supabase
        .from("goal_milestones")
        .insert(milestonesToInsert);

      if (insertError) {
        logger.error(`Failed to insert relational roadmap milestones: ${insertError.message}`);
      }
    }

    return goal;
  }

  /**
   * Updates an existing goal (title, type, status, description, or manual progress fallback)
   */
  static async updateGoalForUser(
    goalId: string,
    userId: string,
    payload: {
      title?: string;
      type?: string;
      status?: string;
      description?: string;
      progress?: number;
      target_date?: string;
    },
  ) {
    // Verify ownership
    const { data: existing, error: existError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError("Goal not found");
    }

    const updatePayload: Record<string, any> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.type !== undefined) updatePayload.category = payload.type.toLowerCase();
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.progress !== undefined) updatePayload.progress = payload.progress;
    if (payload.target_date !== undefined) updatePayload.target_date = payload.target_date;

    const { data, error } = await supabase
      .from("goals")
      .update(updatePayload)
      .eq("id", goalId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update goal: ${error.message}`, 400);
    }

    // Sync progress in case status changed manually
    await this.recalculateGoalProgress(goalId, userId);

    return data;
  }

  /**
   * Regenerates a goal's milestones using Gemini AI
   */
  static async regenerateGoalRoadmap(goalId: string, userId: string) {
    const { data: existing, error: existError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError("Goal not found");
    }

    // 1. Delete all existing milestones for this goal
    const { error: deleteError } = await supabase
      .from("goal_milestones")
      .delete()
      .eq("goal_id", goalId);

    if (deleteError) {
      throw new AppError(
        `Failed to clear existing milestones for regeneration: ${deleteError.message}`,
        400,
      );
    }

    // 2. Call Gemini to generate a fresh milestones list (5–10 items)
    const ai = getAIProvider();
    const gen = await (ai as any).generateGoalRoadmap(existing.title, existing.description);
    const generatedMilestones = gen.milestones || [];

    // 3. Bulk insert the new milestones
    if (generatedMilestones.length > 0) {
      const milestonesToInsert = generatedMilestones.map((m: any, idx: number) => ({
        goal_id: goalId,
        title: m.title,
        completed: false,
        order_index: idx,
      }));

      const { error: insertError } = await supabase
        .from("goal_milestones")
        .insert(milestonesToInsert);

      if (insertError) {
        throw new AppError(
          `Failed to insert fresh roadmap milestones: ${insertError.message}`,
          400,
        );
      }
    }

    // 4. Reset progress & status on parent goal and return
    return this.recalculateGoalProgress(goalId, userId);
  }

  /**
   * Adds a manual milestone to a goal
   */
  static async addMilestone(goalId: string, userId: string, title: string) {
    // 1. Verify owner of goal config first
    const { data: existingGoal, error: existError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existingGoal) {
      throw new NotFoundError("Goal not found");
    }

    // 2. Query current milestones to calculate next order_index
    const { data: existingMilestones } = await supabase
      .from("goal_milestones")
      .select("order_index")
      .eq("goal_id", goalId)
      .order("order_index", { ascending: false });

    const nextIndex =
      existingMilestones && existingMilestones.length > 0
        ? (existingMilestones[0].order_index ?? 0) + 1
        : 0;

    // 3. Insert milestone row
    const { data: milestone, error: insertError } = await supabase
      .from("goal_milestones")
      .insert({
        goal_id: goalId,
        title,
        completed: false,
        order_index: nextIndex,
      })
      .select()
      .single();

    if (insertError) {
      throw new AppError(`Failed to add milestone: ${insertError.message}`, 400);
    }

    // 4. Update parent goal progress
    await this.recalculateGoalProgress(goalId, userId);

    return milestone;
  }

  /**
   * Updates a specific milestone (completion, title, or order)
   */
  static async updateMilestone(
    goalId: string,
    milestoneId: string,
    userId: string,
    payload: { title?: string; completed?: boolean; order_index?: number },
  ) {
    // 1. Verify owner of goal config first
    const { data: existingGoal, error: existError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existingGoal) {
      throw new NotFoundError("Goal not found");
    }

    const updatePayload: Record<string, any> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.order_index !== undefined) updatePayload.order_index = payload.order_index;

    if (payload.completed !== undefined) {
      updatePayload.completed = payload.completed;
      updatePayload.completed_at = payload.completed ? new Date().toISOString() : null;
    }

    // 2. Update milestone
    const { data: milestone, error: updateError } = await supabase
      .from("goal_milestones")
      .update(updatePayload)
      .eq("id", milestoneId)
      .eq("goal_id", goalId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(`Failed to update milestone: ${updateError.message}`, 400);
    }

    // 3. Update parent goal progress
    await this.recalculateGoalProgress(goalId, userId);

    return milestone;
  }

  /**
   * Deletes a milestone from a goal
   */
  static async deleteMilestone(goalId: string, milestoneId: string, userId: string): Promise<void> {
    // 1. Verify owner of goal config first
    const { data: existingGoal, error: existError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existingGoal) {
      throw new NotFoundError("Goal not found");
    }

    // 2. Delete milestone
    const { error: deleteError } = await supabase
      .from("goal_milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("goal_id", goalId);

    if (deleteError) {
      throw new AppError(`Failed to delete milestone: ${deleteError.message}`, 400);
    }

    // 3. Update parent goal progress
    await this.recalculateGoalProgress(goalId, userId);
  }

  /**
   * Bulk reorders milestones for a goal
   */
  static async reorderMilestones(
    goalId: string,
    userId: string,
    orders: { id: string; order_index: number }[],
  ) {
    // 1. Verify owner of goal config first
    const { data: existingGoal, error: existError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existingGoal) {
      throw new NotFoundError("Goal not found");
    }

    // 2. Update each milestone's order_index in database
    for (const item of orders) {
      const { error } = await supabase
        .from("goal_milestones")
        .update({ order_index: item.order_index })
        .eq("id", item.id)
        .eq("goal_id", goalId);

      if (error) {
        throw new AppError(
          `Failed to update order for milestone ${item.id}: ${error.message}`,
          400,
        );
      }
    }

    return { success: true };
  }

  /**
   * Safely deletes a goal configuration
   */
  static async deleteGoalForUser(goalId: string, userId: string): Promise<void> {
    const { data: existing, error: existError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (existError || !existing) {
      throw new NotFoundError("Goal not found");
    }

    const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", userId);

    if (error) {
      throw new AppError(`Failed to delete goal: ${error.message}`, 400);
    }
  }
}
