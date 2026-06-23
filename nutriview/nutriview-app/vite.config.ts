import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build target : un seul `dist/index.html` auto-contenu (JS + CSS + fonts inlinés)
// destiné à être déposé tel quel par le plugin WordPress `dnai-nutriview`.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
