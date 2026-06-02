import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Session, User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Initial retrieval of session
    async function bootstrapSession() {
      try {
        const {
          data: { session: activeSession },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (mounted) {
          setSession(activeSession);
          setUser(activeSession?.user ?? null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Failed to initialize active auth session");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrapSession();

    // 2. Listen reactively to auth state updates (sign_in, sign_out, token_refreshed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      if (mounted) {
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Signs in user with email and password credentials
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      return { data, error: null };
    } catch (err: any) {
      const errMsg = err.message || "Invalid email or password";
      setError(errMsg);
      return { data: null, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registers a new account with email, password, and user profile metadata
   */
  const signup = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signupError) throw signupError;
      return { data, error: null };
    } catch (err: any) {
      const errMsg = err.message || "Failed to register new account";
      setError(errMsg);
      return { data: null, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Signs out current user and flushes storage tokens
   */
  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;

      // Optional: Clear any local storages if necessary
      setUser(null);
      setSession(null);
    } catch (err: any) {
      setError(err.message || "Failed to successfully sign out");
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    signup,
    logout,
  };
}
