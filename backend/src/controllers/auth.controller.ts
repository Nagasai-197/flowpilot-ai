import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

export class AuthController {
  /**
   * Registers a new user session
   */
  static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password, fullName, timezone } = req.body;

    if (!email || !password || !fullName) {
      return next(new BadRequestError('Email, password, and full name are required'));
    }

    try {
      const data = await AuthService.signUpUser(email, password, fullName, timezone);
      res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: data.user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Logs in a user session
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new BadRequestError('Email and password are required'));
    }

    try {
      const { user, session } = await AuthService.logInUser(email, password);
      res.status(200).json({
        status: 'success',
        message: 'Authentication successful',
        data: {
          user,
          session: {
            accessToken: session?.access_token,
            refreshToken: session?.refresh_token,
            expiresAt: session?.expires_at,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves active authenticated user details
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  }

  /**
   * Signs out a user session
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Not logged in'));
    }

    const token = authHeader.split(' ')[1];

    try {
      await AuthService.logOutUser(token);
      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out',
      });
    } catch (err) {
      next(err);
    }
  }
}
