import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeApp } from "./services/appInit";

// Initialize application services before rendering
initializeApp();

createRoot(document.getElementById("root")!).render(<App />);
