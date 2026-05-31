import { Request, Response, NextFunction } from 'express';

const ipCache = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const now = Date.now();
    const record = ipCache.get(ip);

    if (!record || now > record.resetTime) {
      ipCache.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    record.count++;
    if (record.count > limit) {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests to FlowPilot AI. Please wait a moment and try again.',
      });
      return;
    }

    next();
  };
}
