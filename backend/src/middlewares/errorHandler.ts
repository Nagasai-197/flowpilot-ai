import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isOperational =
    err instanceof AppError || (err && typeof (err as any).statusCode === "number");
  if (isOperational) {
    const statusCode = (err as any).statusCode || 400;
    logger.warn(`Operational Error: ${statusCode} - ${err.message}`);
    res.status(statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  // Crash / System errors get logged securely
  logger.error(`Critical Error: ${err.message}\nStack: ${err.stack}`);
  res.status(500).json({
    status: "error",
    message: err.message,
    name: err.name,
    stack: err.stack,
  });
};
