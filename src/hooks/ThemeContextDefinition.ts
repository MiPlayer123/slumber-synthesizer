import { createContext } from "react";

// Copy the Theme types here
type Theme = "dark" | "light";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Define and export the context
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);
