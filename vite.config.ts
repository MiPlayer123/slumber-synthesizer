import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. load all env vars (no prefix filter)
  const env = loadEnv(mode, process.cwd(), "");

  // 2. coerce to the right types
  const PORT = env.PORT ? parseInt(env.PORT, 10) : 8080;
  const ORIGIN = env.ORIGIN || "http://localhost";
  const API = env.SUPABASE_URL || "https://api.lucidrem.com";

  return {
    server: {
      host: "::",
      port: PORT,
      proxy: {
        // Proxy requests to the Supabase Edge Functions
        "/api/functions/v1": {
          target: API,
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/functions\/v1/, "/functions/v1"),
          headers: {
            Origin: ORIGIN,
          },
        },
        // Proxy requests to the Supabase REST API
        "/api/rest/v1": {
          target: API,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/rest\/v1/, "/rest/v1"),
          headers: {
            Origin: ORIGIN,
          },
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Add redirects for handling malformed URLs
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code to help with caching
            vendor: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
  };
});
