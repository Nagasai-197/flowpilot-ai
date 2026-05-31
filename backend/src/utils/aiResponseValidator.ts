import { AIPlanResponse, AIScheduleBlock } from '../providers/ai/ai.provider.js';
import { logger } from './logger.js';

export class AIResponseValidator {
  /**
   * Safe baseline fallback schedule generator if AI output is unparseable
   */
  static fallbackGracefully(
    _userId: string,
    dateStr: string,
    workingHoursStart?: string,
    workingHoursEnd?: string,
    offsetStr?: string
  ): AIPlanResponse {
    logger.warn(`AIResponseValidator: Falling back gracefully to baseline schedule for date ${dateStr}`);

    const start = workingHoursStart || '09:00:00';
    const end = workingHoursEnd || '17:00:00';
    const offset = offsetStr || 'Z';

    const workStart = new Date(`${dateStr}T${start}${offset}`);
    const workEnd = new Date(`${dateStr}T${end}${offset}`);

    const baseSchedule: AIScheduleBlock[] = [];

    // Add warm-up block
    const warmUpStart = new Date(workStart.getTime());
    const warmUpEnd = new Date(warmUpStart.getTime() + 15 * 60 * 1000);

    if (warmUpEnd.getTime() <= workEnd.getTime()) {
      baseSchedule.push({
        label: 'Warm-up & Planning',
        type: 'break',
        start_time: warmUpStart.toISOString(),
        end_time: warmUpEnd.toISOString(),
        color: 'peach',
      });

      // Add deep focus block
      const focusStart = new Date(warmUpEnd.getTime());
      const focusEnd = new Date(focusStart.getTime() + 90 * 60 * 1000);

      if (focusEnd.getTime() <= workEnd.getTime()) {
        baseSchedule.push({
          label: 'Deep Work · High Priority Task',
          type: 'focus',
          start_time: focusStart.toISOString(),
          end_time: focusEnd.toISOString(),
          color: 'lavender',
        });

        // Add break block
        const breakStart = new Date(focusEnd.getTime());
        const breakEnd = new Date(breakStart.getTime() + 15 * 60 * 1000);

        if (breakEnd.getTime() <= workEnd.getTime()) {
          baseSchedule.push({
            label: 'Rest & Hydration',
            type: 'break',
            start_time: breakStart.toISOString(),
            end_time: breakEnd.toISOString(),
            color: 'peach',
          });

          // Add secondary focus block
          const focus2Start = new Date(breakEnd.getTime());
          const focus2End = new Date(focus2Start.getTime() + 90 * 60 * 1000);

          if (focus2End.getTime() <= workEnd.getTime()) {
            baseSchedule.push({
              label: 'Secondary Focus Segment',
              type: 'focus',
              start_time: focus2Start.toISOString(),
              end_time: focus2End.toISOString(),
              color: 'lavender',
            });
          }
        }
      }
    }

    const baseRecommendations = [
      'Your schedule was generated from a safe fallback baseline to maintain your daily focus flow within working hours.',
      'Protected focus blocks are scheduled for early cognitive peaks.',
      'Standard breaks are enforced following deep focus segments to prevent exhaustion.',
    ];

    return {
      schedule: baseSchedule,
      recommendations: baseRecommendations,
    };
  }

  /**
   * Validates required properties inside generated blocks
   */
  private static validateRequiredFields(block: any): void {
    const required = ['label', 'type', 'start_time', 'end_time', 'color'];
    for (const field of required) {
      if (!block[field]) {
        throw new Error(`Missing required schedule block property: ${field}`);
      }
    }

    const validTypes = ['focus', 'break', 'meeting', 'habit'];
    // Remap 'routine' to 'break' for backwards compatibility with any cached AI outputs
    if (block.type === 'routine') {
      block.type = 'break';
    } else if (!validTypes.includes(block.type)) {
      block.type = 'break'; // Safe fallback instead of throwing
    }

    const validColors = ['lavender', 'mint', 'sky', 'peach'];
    if (!validColors.includes(block.color)) {
      block.color = 'lavender'; // Safe fallback instead of throwing
    }
  }

  /**
   * Validates chronological ranges (end_time after start_time)
   */
  private static validateTimeRange(block: AIScheduleBlock): void {
    const start = new Date(block.start_time).getTime();
    const end = new Date(block.end_time).getTime();

    if (isNaN(start) || isNaN(end)) {
      throw new Error(`Malformed block timestamp value for label ${block.label}`);
    }

    if (end <= start) {
      throw new Error(`Block end time must strictly succeed start time for label ${block.label}`);
    }
  }

  /**
   * Main validator checker executing all structural tests
   */
  static validate(
    plan: any,
    workingHoursStart?: string,
    workingHoursEnd?: string,
    dateStr?: string,
    offsetStr?: string
  ): AIPlanResponse {
    if (!plan || typeof plan !== 'object') {
      throw new Error('AI Planner returned an invalid plan structure');
    }

    if (!Array.isArray(plan.schedule)) {
      throw new Error('AI Planner schedule list must be an array');
    }

    if (!Array.isArray(plan.recommendations)) {
      throw new Error('AI Planner recommendations list must be an array');
    }

    // Standardize out-of-bounds start/end checks if workingHoursStart/workingHoursEnd are provided
    const padTime = (t: string) => {
      if (!t) return '00:00:00';
      const parts = t.split(':');
      if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`;
      if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    };

    const offset = offsetStr || 'Z';
    const workStart = workingHoursStart && dateStr ? new Date(`${dateStr}T${padTime(workingHoursStart)}${offset}`).getTime() : null;
    const workEnd = workingHoursEnd && dateStr ? new Date(`${dateStr}T${padTime(workingHoursEnd)}${offset}`).getTime() : null;

    // 1. Audit individual blocks
    const validatedSchedule: AIScheduleBlock[] = [];
    for (const rawBlock of plan.schedule) {
      this.validateRequiredFields(rawBlock);
      
      const block: AIScheduleBlock = {
        label: String(rawBlock.label),
        type: rawBlock.type,
        start_time: String(rawBlock.start_time),
        end_time: String(rawBlock.end_time),
        color: rawBlock.color,
      };

      this.validateTimeRange(block);

      const blockStart = new Date(block.start_time).getTime();
      const blockEnd = new Date(block.end_time).getTime();

      if (workStart && blockStart < workStart) {
        throw new Error(`Block '${block.label}' starts at ${block.start_time}, which is before the work start time of ${workingHoursStart}`);
      }

      if (workEnd && blockEnd > workEnd) {
        throw new Error(`Block '${block.label}' ends at ${block.end_time}, which is after the work end time of ${workingHoursEnd}`);
      }

      validatedSchedule.push(block);
    }

    // 2. Validate Overlaps
    // Sort timeline chronologically
    const sorted = [...validatedSchedule].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const prevEnd = new Date(prev.end_time).getTime();
      const currStart = new Date(curr.start_time).getTime();

      if (currStart < prevEnd) {
        throw new Error(
          `Overlapping timeline blocks identified: '${prev.label}' ends at ${prev.end_time} but '${curr.label}' starts at ${curr.start_time}`
        );
      }
    }

    return {
      schedule: sorted,
      recommendations: plan.recommendations.map(String),
    };
  }
}
