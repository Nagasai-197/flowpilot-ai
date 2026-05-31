import { AIProvider, AIPlanRequest, AIPlanResponse, AIAssistantRequest, AIAssistantResponse } from './ai.provider.js';
import { config } from '../../config/index.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

// ─── Model Config ────────────────────────────────────────────────────────────
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite-preview-05-20';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Max ms to wait for a single model attempt before aborting and trying fallback */
const REQUEST_TIMEOUT_MS = 25_000; // 25 seconds

/** HTTP status codes that trigger fallback to lite model */
const FALLBACK_ON_STATUS = new Set([429, 503]);

// ─── Shared HTTP caller ───────────────────────────────────────────────────────
/**
 * Calls Gemini with PRIMARY_MODEL first.
 * On 429 / 503 / timeout → retries automatically with FALLBACK_MODEL.
 * Returns the parsed JSON response body on success.
 * Throws AppError on all failure paths so Express error handler catches it.
 */
async function callGemini(
  apiKey: string,
  method: string,
  payload: object
): Promise<any> {
  const endpoints = [
    `${GEMINI_BASE}/${PRIMARY_MODEL}:${method}?key=${apiKey}`,
    `${GEMINI_BASE}/${FALLBACK_MODEL}:${method}?key=${apiKey}`,
  ];

  let lastError: AppError | null = null;

  for (let i = 0; i < endpoints.length; i++) {
    const model = i === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;
    const url = endpoints[i];

    // Fresh AbortController so each attempt has its own timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      const isTimeout = networkErr.name === 'AbortError' || networkErr.name === 'TimeoutError';
      const msg = isTimeout
        ? `Gemini request timed out after ${REQUEST_TIMEOUT_MS / 1000}s (${model})`
        : `Gemini network error (${model}): ${networkErr.message}`;

      logger.error(msg);
      lastError = new AppError(msg, 502);

      if (isTimeout && i === 0) {
        logger.warn(`Gemini primary timed out. Retrying with ${FALLBACK_MODEL}...`);
        continue; // try fallback
      }
      break; // non-timeout network error or fallback also failed
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      if (i > 0) {
        logger.info(`Gemini fallback model (${FALLBACK_MODEL}) responded successfully.`);
      }
      return response.json();
    }

    const errorBody = await response.text();
    logger.error(`Gemini API Error [${model}] Status ${response.status} - ${errorBody}`);

    if (FALLBACK_ON_STATUS.has(response.status) && i === 0) {
      logger.warn(`Gemini primary unavailable (${response.status}). Retrying with ${FALLBACK_MODEL}...`);
      lastError = new AppError(`AI API request failed: Status ${response.status}`, 502);
      continue; // try fallback
    }

    // Non-retryable HTTP error
    throw new AppError(`AI API request failed: Status ${response.status}`, 502);
  }

  throw lastError ?? new AppError('All Gemini model endpoints failed', 502);
}

// ─── Provider ────────────────────────────────────────────────────────────────
export class GeminiProvider implements AIProvider {

  // ── Schedule Plan ──────────────────────────────────────────────────────────
  async generateSchedulePlan(request: AIPlanRequest): Promise<AIPlanResponse> {
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'placeholder-gemini-key') {
      throw new AppError('Gemini API Key is unconfigured or invalid', 500);
    }

    const deepWorkMin = request.preferredDeepWorkDuration ?? 90;
    const breakMin = request.breakDuration ?? 15;
    const offset = request.offsetStr || 'Z';

    const promptText = `
You are FlowPilot's scientifically backed cognitive scheduling engine.
Your ONLY job is to build a highly productive, deep-work-optimized single-day schedule.
Date: ${request.dateStr}. Working Hours: ${request.workingHoursStart} to ${request.workingHoursEnd}.
Preferred Deep Work Duration: ${deepWorkMin} minutes. Preferred Break Duration: ${breakMin} minutes.

HIGH PRIORITY TASKS (schedule FIRST, in ${deepWorkMin} min deep work blocks during morning peak):
${JSON.stringify(request.tasks.filter((t: any) => t.priority === 'high'), null, 2)}

MEDIUM PRIORITY TASKS (schedule after high-priority blocks):
${JSON.stringify(request.tasks.filter((t: any) => t.priority === 'med' || t.priority === 'medium'), null, 2)}

LOW PRIORITY TASKS (fill remaining slots):
${JSON.stringify(request.tasks.filter((t: any) => t.priority === 'low'), null, 2)}

HABITS TO SLOT (morning/evening routine slots):
${JSON.stringify(request.habits, null, 2)}

MANDATORY SCHEDULING RULES:
1. HIGH PRIORITY tasks → schedule strictly in ${deepWorkMin} min focus blocks. MUST go in morning peak hours (first 3 hours of the workday/available time window).
2. MEDIUM priority tasks → schedule in ${Math.round(deepWorkMin * 0.67)} to ${deepWorkMin} min blocks. Afternoon slots.
3. LOW priority tasks → schedule in ${Math.round(deepWorkMin * 0.33)} to ${Math.round(deepWorkMin * 0.67)} min blocks. Late afternoon.
4. MANDATORY: Insert a ${breakMin}-min "break" block after EVERY focus block.
5. Morning warm-up: Add a ${breakMin}-min "Warm-up & Planning" break block at the very start of the workday/available time window.
6. Afternoon reset: Add a ${breakMin}-min "Afternoon Reset" break block after lunch (≈ 1:00 PM, or if available time start is after 1:00 PM, insert a break after the first focus segment).
7. Habits in their natural slots: morning routines at day start, evening habits near day end.
8. NEVER schedule two focus blocks back-to-back without a break. Prevents cognitive burnout.
9. Minimize context switching: group related tasks (same tag/domain) consecutively.
10. All timestamps MUST be ISO 8601 with date: ${request.dateStr} and timezone offset: ${offset}. Format: ${request.dateStr}T09:00:00.000${offset}
11. Valid block types: 'focus', 'break', 'meeting', 'habit'. Use 'break' for warm-ups and resets.
12. Valid colors: 'lavender' (focus/high), 'mint' (habits/health), 'sky' (meetings), 'peach' (breaks/low).

Return ONLY valid JSON. No markdown fences.
Schema:
{
  "schedule": [{"label":"...","type":"focus|break|meeting|habit","start_time":"ISO8601","end_time":"ISO8601","color":"lavender|mint|sky|peach"}],
  "recommendations": ["science-backed insight about this schedule"]
}
`;

    const payload = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            schedule: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  label: { type: 'STRING' },
                  type: { type: 'STRING', enum: ['focus', 'break', 'meeting', 'habit'] },
                  start_time: { type: 'STRING' },
                  end_time: { type: 'STRING' },
                  color: { type: 'STRING', enum: ['lavender', 'mint', 'sky', 'peach'] },
                },
                required: ['label', 'type', 'start_time', 'end_time', 'color'],
              },
            },
            recommendations: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['schedule', 'recommendations'],
        },
      },
    };

    try {
      const resData = await callGemini(apiKey, 'generateContent', payload);
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new AppError('Gemini API returned an empty generation response candidate', 502);
      }

      const plan: AIPlanResponse = JSON.parse(rawText);
      return plan;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error(`Failed to generate schedule from Gemini: ${err.message}`);
      throw new AppError(`AI Schedule Generation failed: ${err.message}`, 500);
    }
  }

  // ── AI Assistant ───────────────────────────────────────────────────────────
  async askAssistant(request: AIAssistantRequest): Promise<AIAssistantResponse> {
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'placeholder-gemini-key') {
      throw new AppError('Gemini API Key is unconfigured or invalid', 500);
    }

    const systemPrompt = `
You are FlowPilot's intelligent productivity co-pilot. You have FULL real-time access to the user's workspace data.

=== USER'S LIVE WORKSPACE DATA ===
Tasks Summary: ${request.context.tasksSummary}
Habits Summary: ${request.context.habitsSummary}
Today's Schedule: ${request.context.scheduleSummary}
Performance Stats: ${request.context.analyticsSummary}
Active Goals: ${(request.context as any).goalsSummary || 'No goals set yet.'}
Working Hours: ${request.context.workingHours}

=== BEHAVIOR RULES (STRICTLY FOLLOW) ===
1. DATA-FIRST: You already have the user's tasks, habits, schedule, goals, and analytics above. USE THEM immediately. Never say "Could you tell me about your tasks?" - you already know.
2. BE SPECIFIC: Reference actual task names, habit names, goal titles, and real numbers from the data above.
3. GOALS-AWARE: When the user asks about productivity, priorities, or planning — factor in their active goals and current progress %.
4. NO GENERIC RESPONSES: Never give advice that ignores the data. Always ground your reply in the user's actual situation.
5. ONLY ASK FOLLOW-UPS when critical info is truly missing (e.g., a specific meeting time, a preference not in data).
6. CONCISE & ACTIONABLE: Use Markdown bullets and bold. Keep replies under 300 words unless a full briefing is requested.
7. ACTION DETECTION: Detect if the user wants to create/modify tasks, habits, or goals and set the action field accordingly.

=== ACTION RULES ===
- User wants to create a task → action type: "create_task", payload: {title, priority: "high|med|low", tag, color: "lavender|mint|sky|peach"}
- User wants to regenerate schedule → action type: "regenerate_plan"
- User wants to delete a task → action type: "delete_task" with requiresConfirmation: true, payload: {id, title}
- User wants to complete a task → action type: "complete_task" with requiresConfirmation: true, payload: {id, title}
- User wants to create a goal → action type: "create_goal", payload: {title, type: "Career|Health|Learning|Personal"}
- Otherwise → action type: "none"

Return valid JSON matching exactly:
{"text": "Markdown response", "action": {"type": "none|create_task|delete_task|complete_task|create_goal|regenerate_plan", "requiresConfirmation": false, "payload": {}}}
`;

    const contents: any[] = [];

    // Inject system instructions as first turn user prompt to force bounds
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });

    contents.push({
      role: 'model',
      parts: [{ text: "Understood. I have locked in all the user context summaries, active tasks ratios, habit streaks, and schedule blocks. I am ready to assist as their calm productivity co-pilot." }]
    });

    // Append standard history
    request.history.forEach((h) => {
      contents.push({
        role: (h.role as string) === 'ai' ? 'model' : h.role,
        parts: h.parts
      });
    });

    // Append current message
    contents.push({
      role: 'user',
      parts: [{ text: request.message }]
    });

    const payload = {
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING' },
            action: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING', enum: ['reschedule_plan', 'create_task', 'toggle_habit', 'none'] },
                payload: { type: 'OBJECT' }
              },
              required: ['type']
            }
          },
          required: ['text', 'action']
        }
      }
    };

    try {
      const resData = await callGemini(apiKey, 'generateContent', payload);
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new AppError('Gemini Assistant returned an empty generation response candidate', 502);
      }

      const reply: AIAssistantResponse = JSON.parse(rawText);
      return reply;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error(`Failed to get chat response from Gemini: ${err.message}`);
      throw new AppError(`AI Assistant Chat failed: ${err.message}`, 500);
    }
  }
}
