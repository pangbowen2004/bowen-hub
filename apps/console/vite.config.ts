import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const localApi = process.env.HUB_LOCAL_API_URL ?? "http://localhost:8787";
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react({ babel: { plugins: ["babel-plugin-react-compiler"] } }),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      "/v1": localApi,
      "/auth": localApi,
      "/.well-known": localApi,
      "/mcp": localApi,
    },
  },
});
