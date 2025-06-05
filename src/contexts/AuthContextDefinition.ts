"use client";

import { createContext } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";

// Copy the AuthContextType interface here
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  needsProfileCompletion: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (
    email: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  resetPassword: (
    password: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  completeGoogleSignUp: (
    username: string,
  ) => Promise<{ success: boolean; error: AuthError | Error | null }>;
  clearAuthStorage: () => boolean;
}

// Define and export the context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
