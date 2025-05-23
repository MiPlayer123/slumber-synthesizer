import { useContext } from "react";

// Assume AuthContext is exported from '../contexts/AuthContextDefinition.ts'
import { AuthContext } from "../contexts/AuthContextDefinition"; // Update path

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
