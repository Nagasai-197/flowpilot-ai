import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { BadRequestError } from "../utils/errors.js";

// Text HTML/Script Stripper Utility to protect against XSS/HTML Injection
function sanitizeString(val: string): string {
  if (typeof val !== "string") return val;
  // Remove script tags, HTML tags, and trim leading/trailing whitespace
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Wipes <script> tags
    .replace(/<[^>]*>/g, "") // Wipes HTML tags
    .trim();
}

// Reusable validator function
export const validateBody = (schema: z.ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Recursively sanitize all string properties in req.body
    const sanitizeObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === "string") return sanitizeString(obj);
      if (Array.isArray(obj)) return obj.map(sanitizeObject);
      if (typeof obj === "object") {
        const res: any = {};
        for (const k in obj) {
          res[k] = sanitizeObject(obj[k]);
        }
        return res;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body ?? {});

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new BadRequestError(`Validation failed: ${errorMsg}`);
    }

    req.body = parsed.data;
    next();
  };
};

const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(100, "Task title exceeds maximum limit of 100 characters"),
  description: z
    .string()
    .max(1000, "Task description exceeds maximum limit of 1000 characters")
    .optional()
    .nullable(),
  status: z.enum(["todo", "doing", "review", "done"]).default("todo").optional(),
  priority: z.enum(["low", "med", "medium", "high"]).default("med").optional(),
  tag: z.string().max(50, "Tag name exceeds maximum limit of 50 characters").optional().nullable(),
  color: z
    .string()
    .max(20, "Color value exceeds maximum limit of 20 characters")
    .optional()
    .nullable(),
  due_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid due date format",
    })
    .optional()
    .nullable(),
});

const habitSchema = z.object({
  name: z
    .string()
    .min(1, "Habit name is required")
    .max(100, "Habit name exceeds maximum limit of 100 characters"),
  color: z
    .string()
    .max(20, "Color value exceeds maximum limit of 20 characters")
    .optional()
    .nullable(),
});

const goalSchema = z.object({
  title: z
    .string()
    .min(1, "Goal title is required")
    .max(100, "Goal title exceeds maximum limit of 100 characters"),
  description: z
    .string()
    .max(1000, "Goal description exceeds maximum limit of 1000 characters")
    .optional()
    .nullable(),
  category: z
    .string()
    .max(50, "Category exceeds maximum limit of 50 characters")
    .optional()
    .nullable(),
  type: z.string().max(50, "Type exceeds maximum limit of 50 characters").optional().nullable(),
  status: z.enum(["active", "paused", "completed"]).default("active").optional(),
  progress: z.number().min(0).max(100).optional(),
  target_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid target date format",
    })
    .optional()
    .nullable(),
});

const assistantSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500, "Assistant message exceeds maximum limit of 500 characters"),
  history: z.array(z.any()).optional().default([]),
});

const plannerGenerateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
    .optional(),
  preferredDeepWorkDuration: z.number().int().min(15).max(240).optional(),
  breakDuration: z.number().int().min(5).max(120).optional(),
  currentTime: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid currentTime format",
    })
    .optional(),
});

const plannerBlockBaseSchema = z.object({
  title: z
    .string()
    .min(1, "Block title is required")
    .max(120, "Block title exceeds maximum limit of 120 characters"),
  block_type: z.enum(["focus", "break", "meeting", "habit"]),
  start_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start_time format",
  }),
  end_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end_time format",
  }),
  color: z.enum(["lavender", "mint", "sky", "peach"]).optional(),
});

const plannerBlockSchema = plannerBlockBaseSchema.refine(
  (val) => new Date(val.end_time).getTime() > new Date(val.start_time).getTime(),
  {
    message: "end_time must be after start_time",
    path: ["end_time"],
  },
);

const plannerBlockUpdateSchema = plannerBlockBaseSchema.partial().refine(
  (val) => {
    if (!val.start_time || !val.end_time) return true;
    return new Date(val.end_time).getTime() > new Date(val.start_time).getTime();
  },
  {
    message: "end_time must be after start_time",
    path: ["end_time"],
  },
);

const focusSessionSchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  goal_id: z.string().uuid().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  duration_minutes: z
    .number()
    .finite()
    .int()
    .min(1)
    .max(24 * 60),
  type: z.enum(["pomodoro", "extended_focus", "deep_work", "custom"]),
  completed: z.boolean().optional().default(true),
});

const reviewDraftSchema = z.object({
  type: z.enum(["weekly", "monthly"]),
  period_start: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid period_start format",
  }),
  period_end: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid period_end format",
  }),
});

const reviewCreateSchema = reviewDraftSchema.extend({
  wins: z.array(z.string().max(300)).optional().default([]),
  missed_tasks: z.array(z.any()).optional().default([]),
  goal_progress: z.array(z.any()).optional().default([]),
  habit_performance: z.record(z.any()).optional().default({}),
  reflection_q_and_a: z.record(z.any()).optional().default({}),
  next_plan: z.record(z.any()).optional().default({}),
});

const taskToggleSchema = z.object({
  completed: z.boolean().optional(),
  status: z.enum(["todo", "doing", "review", "done"]).optional(),
});

export const validateTaskInput = validateBody(taskSchema);
const taskUpdateSchema = taskSchema.partial();
export const validateTaskUpdateInput = validateBody(taskUpdateSchema);
export const validateHabitInput = validateBody(habitSchema);
export const validateGoalInput = validateBody(goalSchema);
const goalUpdateSchema = goalSchema.partial();
export const validateGoalUpdateInput = validateBody(goalUpdateSchema);
export const validateAssistantInput = validateBody(assistantSchema);
export const validatePlannerGenerateInput = validateBody(plannerGenerateSchema);
export const validatePlannerBlockInput = validateBody(plannerBlockSchema);
export const validatePlannerBlockUpdateInput = validateBody(plannerBlockUpdateSchema);
export const validateFocusSessionInput = validateBody(focusSessionSchema);
export const validateReviewDraftInput = validateBody(reviewDraftSchema);
export const validateReviewCreateInput = validateBody(reviewCreateSchema);
export const validateTaskToggleInput = validateBody(taskToggleSchema);
