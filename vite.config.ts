import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import path from "path";

import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",

    port: 8080,

    hmr: {
      overlay: false,
    },

    /*
      Development proxy for backend API.
      Prevents CORS issues during local development.
    */
    proxy: {
      "/api": {
        target: "http://localhost:3001",

        changeOrigin: true,
      },
    },
  },

  /*
    Production build configuration.
    Keep Vite chunking automatic.

    IMPORTANT:
    Removed manualChunks because it caused:
    - circular chunk dependencies
    - duplicated runtime modules
    - Supabase realtime instability
    - React Query duplication
    - websocket lifecycle inconsistencies

    Vite already performs intelligent chunk splitting automatically.
  */
  build: {
    chunkSizeWarningLimit: 2000,
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
