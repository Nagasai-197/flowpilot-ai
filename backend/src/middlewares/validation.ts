import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors.js';

export function validateTaskInput(req: Request, _res: Response, next: NextFunction) {
  const { title, description } = req.body;
  if (title !== undefined && typeof title === 'string' && title.length > 100) {
    throw new BadRequestError('Task title exceeds maximum limit of 100 characters');
  }
  if (description !== undefined && typeof description === 'string' && description.length > 1000) {
    throw new BadRequestError('Task description exceeds maximum limit of 1000 characters');
  }
  next();
}

export function validateHabitInput(req: Request, _res: Response, next: NextFunction) {
  const { name } = req.body;
  if (name !== undefined && typeof name === 'string' && name.length > 100) {
    throw new BadRequestError('Habit name exceeds maximum limit of 100 characters');
  }
  next();
}

export function validateGoalInput(req: Request, _res: Response, next: NextFunction) {
  const { title, description } = req.body;
  if (title !== undefined && typeof title === 'string' && title.length > 100) {
    throw new BadRequestError('Goal title exceeds maximum limit of 100 characters');
  }
  if (description !== undefined && typeof description === 'string' && description.length > 1000) {
    throw new BadRequestError('Goal description exceeds maximum limit of 1000 characters');
  }
  next();
}

export function validateAssistantInput(req: Request, _res: Response, next: NextFunction) {
  const { message } = req.body;
  if (message !== undefined && typeof message === 'string' && message.length > 500) {
    throw new BadRequestError('Assistant message exceeds maximum limit of 500 characters');
  }
  next();
}
