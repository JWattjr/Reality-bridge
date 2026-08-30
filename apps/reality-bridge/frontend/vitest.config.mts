import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  root: projectRoot,
  // This app has one alias. Resolving it directly keeps Vitest from asking
  // vite-tsconfig-paths to crawl parent workspaces on Windows checkouts.
  resolve: { alias: { "@": sourceRoot } },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
