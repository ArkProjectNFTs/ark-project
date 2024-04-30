/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";

const config: Config = {
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  preset: "ts-jest/presets/default-esm",
  setupFiles: ["<rootDir>/tests/setup.ts"]
};

export default config;
