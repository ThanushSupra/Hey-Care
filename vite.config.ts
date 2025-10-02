// Vite configuration for the HeyCare web app.
// This file is developer-owned and is typically updated when:
// - Changing dev server host/port
// - Adding/removing Vite plugins
// - Defining path aliases (e.g., "@" → "./src")
// No runtime behavior of the app is changed by comments here.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Local development server options
  server: {
    // Bind on IPv6 "all interfaces" so the server is reachable locally
    host: "::",
    // Developer-friendly default port
    port: 8080,
  },

  // Vite plugins used by the project
  // - "@vitejs/plugin-react-swc" provides fast React + TS transpilation
  plugins: [react()],

  // Path alias configuration so imports can use "@/" instead of relative chains
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
