import { Request, Response, NextFunction } from 'express';
import { AssistantService } from '../services/assistant.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

export class AssistantController {
  /**
   * Processes chat conversation requests
   */
  static async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError());
    }

    const { message, history } = req.body;

    if (!message) {
      return next(new BadRequestError('Chat prompt message is required'));
    }

    try {
      const response = await AssistantService.processChat(userId, message, history || []);
      res.status(200).json({
        status: 'success',
        data: response,
      });
    } catch (err) {
      next(err);
    }
  }
}
