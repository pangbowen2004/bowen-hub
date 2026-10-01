import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
export default defineConfig({
  site: "https://bowen-market-observatory.pages.dev",
  output: "static",
  integrations: [react(), sitemap()],
  server: { port: 4321 },
  vite: { plugins: [tailwindcss()] },
});
