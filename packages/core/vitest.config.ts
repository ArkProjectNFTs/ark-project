import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./tests/setup.ts")],
    hookTimeout: 60000,
    testTimeout: 30000,
    logHeapUsage: true
  }
});
