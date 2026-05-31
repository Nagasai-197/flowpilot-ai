import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { UnauthorizedError } from '../utils/errors.js';

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new UnauthorizedError('Invalid or expired authentication token'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      user_metadata: user.user_metadata,
    };

    next();
  } catch (err) {
    next(new UnauthorizedError('Failed to authenticate token'));
  }
};
