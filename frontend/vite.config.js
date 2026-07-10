import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite config for Cinema Productions frontend (migrated from CRA/react-scripts).
// - Keeps the "@/..." alias to src.
// - Keeps existing `process.env.REACT_APP_BACKEND_URL` references working via `define`.
// - Configures the dev server for the Emergent managed preview (port 3000 + HTTPS proxy on 443).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), "");
  const backendUrl = env.REACT_APP_BACKEND_URL || "";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // Expose CRA-style env vars so existing code keeps working unchanged.
    envPrefix: ["REACT_APP_", "VITE_"],
    define: {
      "process.env.REACT_APP_BACKEND_URL": JSON.stringify(backendUrl),
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      // Preview is served over HTTPS on 443 and proxied to :3000.
      allowedHosts: true,
      hmr: {
        clientPort: 443,
        protocol: "wss",
      },
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ["**/node_modules/**", "**/.git/**", "**/build/**", "**/dist/**"],
      },
    },
    build: {
      // Keep the CRA-compatible output dir so `serve -s build` still works.
      outDir: "build",
      sourcemap: false,
    },
  };
});
