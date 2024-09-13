/** @type {import("eslint").Linter.Config} */
module.exports = {
  ignorePatterns: ["apps/**", "packages/**"],
  extends: ["@ark-project/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true
  },
  settings: {
    next: {
      rootDir: ['apps/*/'],
    },
  },
};
