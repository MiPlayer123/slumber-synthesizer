import { createContext, useContext } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";

// Re-define or import AuthContextType if needed
interface AuthContextType {
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

// Assume AuthContext is exported from '../contexts/AuthContextDefinition.ts'
import { AuthContext } from "../contexts/AuthContextDefinition"; // Update path

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
