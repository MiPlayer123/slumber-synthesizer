import { useContext } from "react";

// Assume ThemeContext is created and exported from the provider file or a shared context file
import { ThemeContext } from "./ThemeContextDefinition"; // Update path

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
