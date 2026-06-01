import { supabase } from '../lib/supabase.js';
import { getAIProvider } from '../providers/ai/index.js';
import { AIResponseValidator } from '../utils/aiResponseValidator.js';
import { TaskService } from './task.service.js';
import { HabitService } from './habit.service.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class PlannerService {
  /**
   * Generates a scientifically optimized, AI-orchestrated day schedule timeline
   */
  static async generatePlanForUser(
    userId: string,
    dateStr?: string,
    preferredDeepWorkDuration?: number,
    breakDuration?: number,
    currentTime?: string
  ) {
    const targetDateStr = dateStr || new Date().toISOString().split('T')[0];

    try {
      // 1. Fetch User profile settings for timezone / working hours resiliently
      let profile: any;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('working_hours_start, working_hours_end, preferred_deep_work_duration, break_duration, timezone')
          .eq('id', userId)
          .single();

        if (error) {
          // Fallback to select without missing columns
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('working_hours_start, working_hours_end, timezone')
            .eq('id', userId)
            .single();

          if (fallbackError) throw fallbackError;
          profile = fallbackData;
        } else {
          profile = data;
        }
      } catch (err: any) {
        logger.warn(`Failed to fetch preferred durations from profiles table: ${err.message}. Falling back.`);
        const { data, error } = await supabase
          .from('profiles')
          .select('working_hours_start, working_hours_end, timezone')
          .eq('id', userId)
          .single();
        
        if (error) {
          throw new AppError(`Failed to fetch user settings: ${error.message}`, 500);
        }
        profile = data;
      }

      const workingHoursStart = profile?.working_hours_start || '09:00:00';
      const workingHoursEnd = profile?.working_hours_end || '17:00:00';

      const deepWorkDuration = preferredDeepWorkDuration ?? (profile as any)?.preferred_deep_work_duration ?? 90;
      const breakDur = breakDuration ?? (profile as any)?.break_duration ?? 15;

      const padTime = (t: string) => {
        if (!t) return '00:00:00';
        const parts = t.split(':');
        if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`;
        if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
      };

      const stdStart = padTime(workingHoursStart);
      const stdEnd = padTime(workingHoursEnd);

      let effectiveStart = stdStart;
      let effectiveEnd = stdEnd;

      // Timezone Offset Calculation
      const getTimeZoneOffsetStr = (timeZone: string, date: Date): string => {
        try {
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'longOffset'
          }).formatToParts(date);
          
          const tzPart = parts.find(p => p.type === 'timeZoneName');
          if (!tzPart) return '+00:00';
          
          const val = tzPart.value; // e.g. "GMT+5:30" or "GMT-04:00"
          if (val === 'GMT') return '+00:00';
          
          const match = val.match(/GMT([+-])(\d+)(?::(\d+))?/);
          if (!match) return '+00:00';
          
          const sign = match[1];
          const hours = match[2].padStart(2, '0');
          const minutes = (match[3] || '00').padStart(2, '0');
          return `${sign}${hours}:${minutes}`;
        } catch (err) {
          return '+00:00';
        }
      };

      const timezone = profile?.timezone || 'UTC';
      const offsetStr = getTimeZoneOffsetStr(timezone, new Date(`${targetDateStr}T12:00:00Z`));

      // Today Planner Skip-Past logic
      if (currentTime && dateStr) {
        const getLocalDayStr = (timeZone: string, date: Date): string => {
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).formatToParts(date);
          const y = parts.find(p => p.type === 'year')?.value || '1970';
          const m = parts.find(p => p.type === 'month')?.value || '01';
          const d = parts.find(p => p.type === 'day')?.value || '01';
          return `${y}-${m}-${d}`;
        };

        const clientLocalDateStr = getLocalDayStr(timezone, new Date(currentTime));
        const isToday = dateStr === clientLocalDateStr;

        if (isToday) {
          const currentMs = new Date(currentTime).getTime();
          const workStartMs = new Date(`${dateStr}T${stdStart}${offsetStr}`).getTime();
          const workEndMs = new Date(`${dateStr}T${stdEnd}${offsetStr}`).getTime();

          if (currentMs >= workEndMs) {
            // Already past working hours for today! Return successfully with empty schedule
            logger.info(`Today planner execution called past working hours end ${stdEnd} for user ${userId}. Returning empty schedule.`);
            
            // Delete existing blocks first to avoid keeping old ones if they re-generate
            await supabase
              .from('schedule_blocks')
              .delete()
              .eq('user_id', userId)
              .gte('start_time', `${dateStr}T00:00:00Z`)
              .lte('start_time', `${dateStr}T23:59:59Z`);

            logger.info(`Planner Generation Info:`);
            logger.info(`- selectedDate: ${targetDateStr}`);
            logger.info(`- workingHoursStart: ${workingHoursStart}`);
            logger.info(`- workingHoursEnd: ${workingHoursEnd}`);
            logger.info(`- effectiveStartTime: ${effectiveStart}`);
            logger.info(`- effectiveEndTime: ${effectiveEnd}`);

            return {
              schedule: [],
              recommendations: ['Your configured working hours for today are already over. Great job today, get some rest!'],
            };
          }

          if (currentMs >= workStartMs) {
            // Skip past slots: round current time up to nearest 15 minutes
            const activeDate = new Date(currentMs);
            const minutes = 15;
            const ms = 1000 * 60 * minutes;
            const roundedDate = new Date(Math.ceil(activeDate.getTime() / ms) * ms);
            
            // Format HH:MM:SS in the user's local timezone
            const roundedParts = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).formatToParts(roundedDate);
            
            const roundedHour = roundedParts.find(p => p.type === 'hour')?.value || '00';
            const roundedMin = roundedParts.find(p => p.type === 'minute')?.value || '00';
            const roundedSec = roundedParts.find(p => p.type === 'second')?.value || '00';
            const roundedTimeStr = `${roundedHour}:${roundedMin}:${roundedSec}`;
            
            logger.info(`Today planner execution inside work window. Skipping past slots. Effective start hour shifted from ${stdStart} to ${roundedTimeStr}`);
            effectiveStart = roundedTimeStr;
          }
        }
      }

      // Add required console log traces
      logger.info(`Planner Generation Info:`);
      logger.info(`- selectedDate: ${targetDateStr}`);
      logger.info(`- workingHoursStart: ${workingHoursStart}`);
      logger.info(`- workingHoursEnd: ${workingHoursEnd}`);
      logger.info(`- effectiveStartTime: ${effectiveStart}`);
      logger.info(`- effectiveEndTime: ${effectiveEnd}`);

      // 2. Fetch User Tasks & Habits
      const tasks = await TaskService.getTasksForUser(userId);
      const habits = await HabitService.getHabitsForUser(userId);

      // Sort tasks by priority (high → med → low) then by due date (soonest first)
      const PRIORITY_ORDER: Record<string, number> = { high: 0, med: 1, medium: 1, low: 2 };
      const activeTasks = [...tasks]
        .filter(t => t.status !== 'done')
        .sort((a, b) => {
          const pa = PRIORITY_ORDER[a.priority] ?? 3;
          const pb = PRIORITY_ORDER[b.priority] ?? 3;
          if (pa !== pb) return pa - pb;
          const today = targetDateStr;
          const aDueToday = a.due_date?.split('T')[0] === today ? 0 : 1;
          const bDueToday = b.due_date?.split('T')[0] === today ? 0 : 1;
          if (aDueToday !== bDueToday) return aDueToday - bDueToday;
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return aDate - bDate;
        })
        .slice(0, 8); // Cap at 8 tasks for focused, deep-work-friendly schedule

      // 3. Request AI generation using swappable provider abstraction
      const provider = getAIProvider();
      
      let rawPlan;
      try {
        rawPlan = await provider.generateSchedulePlan({
          tasks: activeTasks.map((t) => ({
            id: t.id,
            title: t.title,
            tag: t.tag,
            priority: t.priority,
            status: t.status,
            due_date: t.due_date || null,
          })),
          habits: habits.map((h) => ({ id: h.id, name: h.name, color: h.color, streak: h.streak })),
          workingHoursStart: effectiveStart,
          workingHoursEnd: effectiveEnd,
          dateStr: targetDateStr,
          preferredDeepWorkDuration: deepWorkDuration,
          breakDuration: breakDur,
          offsetStr,
        });
      } catch (err: any) {
        logger.error(`AI Planner Provider execution error: ${err.message}`);
        // Trigger safe fallback baseline schedule if LLM provider fails
        rawPlan = AIResponseValidator.fallbackGracefully(userId, targetDateStr, effectiveStart, effectiveEnd, offsetStr);
      }

      // 4. Validate output using integrity guard
      let validatedPlan;
      try {
        validatedPlan = AIResponseValidator.validate(rawPlan, effectiveStart, effectiveEnd, targetDateStr, offsetStr);
      } catch (err: any) {
        logger.error(`AI Response Validation error: ${err.message}`);
        // Trigger safe fallback baseline schedule if LLM yields invalid structures
        validatedPlan = AIResponseValidator.fallbackGracefully(userId, targetDateStr, effectiveStart, effectiveEnd, offsetStr);
      }

      // 5. Database Transaction: Clear today's existing schedule blocks
      const localStartIso = `${targetDateStr}T00:00:00${offsetStr}`;
      const localEndIso = `${targetDateStr}T23:59:59${offsetStr}`;
      const { error: clearBlocksError } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('user_id', userId)
        .gte('start_time', localStartIso)
        .lte('start_time', localEndIso);

      if (clearBlocksError) {
        throw new AppError(`Failed to clear existing schedule: ${clearBlocksError.message}`, 500);
      }

      // 6. DB Sync: Insert verified schedule blocks
      if (validatedPlan.schedule.length > 0) {
        // Allowed DB values per schedule_blocks_block_type_check constraint
        const ALLOWED_BLOCK_TYPES = new Set(['focus', 'break', 'meeting', 'habit']);

        const insertBlocks = validatedPlan.schedule.map((block) => ({
          user_id: userId,
          title: block.label,
          // Sanitize block type — remap any non-DB-valid type (e.g. 'routine') to 'break'
          block_type: ALLOWED_BLOCK_TYPES.has(block.type) ? block.type : 'break',
          start_time: block.start_time,
          end_time: block.end_time,
          color: block.color || 'lavender',
        }));

        const { error: insertBlocksError } = await supabase
          .from('schedule_blocks')
          .insert(insertBlocks);

        if (insertBlocksError) {
          throw new AppError(`Failed to save schedule blocks: ${insertBlocksError.message}`, 500);
        }
      }

      return validatedPlan;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`AI Planner process execution failed: ${err.message}`, 500);
    }
  }

  /**
   * Reads the current schedule plan for the target date.
   * Recommendations are not persisted in DB – returned as empty array.
   */
  static async getCurrentPlanForUser(userId: string, dateStr?: string) {
    const targetDateStr = dateStr || new Date().toISOString().split('T')[0];

    // Fetch user timezone to construct correct local date range
    let timezone = 'UTC';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      if (profile?.timezone) {
        timezone = profile.timezone;
      }
    } catch (err) {
      logger.warn(`Failed to fetch timezone in getCurrentPlanForUser: ${err}`);
    }

    const getTimeZoneOffsetStr = (timeZone: string, date: Date): string => {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone,
          timeZoneName: 'longOffset'
        }).formatToParts(date);
        
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        if (!tzPart) return '+00:00';
        
        const val = tzPart.value; // e.g. "GMT+5:30" or "GMT-04:00"
        if (val === 'GMT') return '+00:00';
        
        const match = val.match(/GMT([+-])(\d+)(?::(\d+))?/);
        if (!match) return '+00:00';
        
        const sign = match[1];
        const hours = match[2].padStart(2, '0');
        const minutes = (match[3] || '00').padStart(2, '0');
        return `${sign}${hours}:${minutes}`;
      } catch (err) {
        return '+00:00';
      }
    };

    const offsetStr = getTimeZoneOffsetStr(timezone, new Date(`${targetDateStr}T12:00:00Z`));
    const localStartIso = `${targetDateStr}T00:00:00${offsetStr}`;
    const localEndIso = `${targetDateStr}T23:59:59${offsetStr}`;

    const { data: blocks, error: blocksError } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', localStartIso)
      .lte('start_time', localEndIso)
      .order('start_time', { ascending: true });

    if (blocksError) {
      throw new AppError(`Failed to fetch schedule plan: ${blocksError.message}`, 500);
    }

    const mappedBlocks = (blocks || []).map((b) => ({
      id: b.id,
      user_id: b.user_id,
      label: b.title,
      type: b.block_type,
      start_time: b.start_time,
      end_time: b.end_time,
      color: b.color || 'lavender',
      created_at: b.created_at,
    }));

    return {
      schedule: mappedBlocks,
      recommendations: [],
    };
  }

  /**
   * Creates a manual schedule block
   */
  static async createBlockForUser(
    userId: string,
    payload: { title: string; block_type: string; start_time: string; end_time: string; color?: string }
  ) {
    const { data, error } = await supabase
      .from('schedule_blocks')
      .insert({
        user_id: userId,
        title: payload.title,
        block_type: payload.block_type,
        start_time: payload.start_time,
        end_time: payload.end_time,
        color: payload.color || 'lavender',
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create block: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Updates an existing schedule block
   */
  static async updateBlockForUser(
    blockId: string,
    userId: string,
    payload: { title?: string; block_type?: string; start_time?: string; end_time?: string; color?: string }
  ) {
    // Verify owner
    const { data: existing, error: existError } = await supabase
      .from('schedule_blocks')
      .select('id')
      .eq('id', blockId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new AppError('Block not found or unauthorized', 404);
    }

    const updatePayload: Record<string, any> = {};
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.block_type !== undefined) updatePayload.block_type = payload.block_type;
    if (payload.start_time !== undefined) updatePayload.start_time = payload.start_time;
    if (payload.end_time !== undefined) updatePayload.end_time = payload.end_time;
    if (payload.color !== undefined) updatePayload.color = payload.color;

    const { data, error } = await supabase
      .from('schedule_blocks')
      .update(updatePayload)
      .eq('id', blockId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update block: ${error.message}`, 400);
    }

    return data;
  }

  /**
   * Deletes a schedule block
   */
  static async deleteBlockForUser(blockId: string, userId: string): Promise<void> {
    const { data: existing, error: existError } = await supabase
      .from('schedule_blocks')
      .select('id')
      .eq('id', blockId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new AppError('Block not found or unauthorized', 404);
    }

    const { error } = await supabase
      .from('schedule_blocks')
      .delete()
      .eq('id', blockId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(`Failed to delete block: ${error.message}`, 400);
    }
  }

  /**
   * Regenerates a single schedule block using Gemini with scientific rationale
   */
  static async regenerateBlockForUser(blockId: string, userId: string) {
    const { data: existing, error: existError } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('id', blockId)
      .eq('user_id', userId)
      .single();

    if (existError || !existing) {
      throw new AppError('Block not found or unauthorized', 404);
    }

    // Compute duration in minutes
    const startMs = new Date(existing.start_time).getTime();
    const endMs = new Date(existing.end_time).getTime();
    const durationMinutes = Math.round((endMs - startMs) / 60000);

    const provider = getAIProvider();
    const gen = await (provider as any).regenerateSingleBlock(
      existing.title,
      existing.block_type,
      durationMinutes
    );

    const { data, error } = await supabase
      .from('schedule_blocks')
      .update({
        title: gen.title,
        block_type: gen.block_type,
        color: gen.color,
      })
      .eq('id', blockId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to save regenerated block: ${error.message}`, 400);
    }

    return {
      block: data,
      rationale: gen.rationale,
    };
  }
}
