import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn(`Operational Error: ${err.statusCode} - ${err.message}`);
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Crash / System errors get logged securely
  logger.error(`Critical Error: ${err.message}\nStack: ${err.stack}`);
  res.status(500).json({
    status: 'error',
    message: err.message,
    name: err.name,
    stack: err.stack,
  });
};
