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
export const validateBody = (schema: z.ZodObject<any, any>) => {
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

    req.body = sanitizeObject(req.body);

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
});

const assistantSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(500, "Assistant message exceeds maximum limit of 500 characters"),
  history: z.array(z.any()).optional().default([]),
});

export const validateTaskInput = validateBody(taskSchema);
const taskUpdateSchema = taskSchema.partial();
export const validateTaskUpdateInput = validateBody(taskUpdateSchema);
export const validateHabitInput = validateBody(habitSchema);
export const validateGoalInput = validateBody(goalSchema);
const goalUpdateSchema = goalSchema.partial();
export const validateGoalUpdateInput = validateBody(goalUpdateSchema);
export const validateAssistantInput = validateBody(assistantSchema);
