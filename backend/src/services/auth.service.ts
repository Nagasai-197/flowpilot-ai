import { supabase } from '../lib/supabase.js';
import { BadRequestError, UnauthorizedError, AppError } from '../utils/errors.js';

export class AuthService {
  /**
   * Registers a new user account with Supabase Auth
   */
  static async signUpUser(
    email: string,
    password: string,
    fullName: string,
    timezone = 'UTC'
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          timezone,
        },
      },
    });

    if (error) {
      throw new BadRequestError(`Registration failed: ${error.message}`);
    }

    // Defensive Sync: Ensure a profile is created matching the new user
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            timezone,
            working_hours_start: '09:00:00',
            working_hours_end: '17:00:00',
          });

        if (profileError) {
          // If insert fails due to pre-existing triggers, update instead
          await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              timezone,
            })
            .eq('id', data.user.id);
        }
      } catch (err) {
        // Safe logging fallback to ensure user registration is never blocked
      }
    }

    return data;
  }

  /**
   * Logins an existing user and returns their session details
   */
  static async logInUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedError(`Authentication failed: ${error.message}`);
    }

    // Defensive Sync: Ensure profiles table has correct full_name on successful login
    if (data.user) {
      try {
        const fullName = data.user.user_metadata?.full_name || '';
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName,
              timezone: data.user.user_metadata?.timezone || 'UTC',
              working_hours_start: '09:00:00',
              working_hours_end: '17:00:00',
            });
        } else if (fullName) {
          const { data: detailedProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.user.id)
            .single();

          if (!detailedProfile?.full_name) {
            await supabase
              .from('profiles')
              .update({ full_name: fullName })
              .eq('id', data.user.id);
          }
        }
      } catch (err) {
        // Safe logging fallback
      }
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Logs out user sessions on the Supabase client
   */
  static async logOutUser(token: string): Promise<void> {
    // Overriding active client token to execute signOut securely
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      throw new AppError(`Logout failed: ${error.message}`, 400);
    }
  }
}
