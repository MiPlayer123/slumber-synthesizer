import { createContext, useContext } from "react";

// Re-define or import Theme type if needed, assume ThemeContextType is also defined/imported
type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Assume ThemeContext is created and exported from the provider file or a shared context file
// If ThemeContext is defined in ThemeProvider file, we need to export it from there first.
// Let's assume for now it's exported from 'use-theme.tsx' or similar.
// We need to adjust the import path based on where ThemeContext is actually defined.
import { ThemeContext } from "./ThemeContextDefinition"; // Update path

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
