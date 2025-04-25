import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    proxy: {
      // Proxy requests to the Supabase Edge Functions
      "/api/functions/v1": {
        target: "https://api.lucidrem.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/functions\/v1/, "/functions/v1"),
        headers: {
          "Origin": process.env.ORIGIN || "http://localhost"
        }
      },
      // Proxy requests to the Supabase REST API
      "/api/rest/v1": {
        target: "https://api.lucidrem.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rest\/v1/, "/rest/v1"),
        headers: {
          "Origin": process.env.ORIGIN || "http://localhost"
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
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
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
}));
