/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@ark-project/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  ignorePatterns: ["generateContracts.cjs"],
  env: {
    jest: true
  },
  plugins: ["jest"],
  parserOptions: {
    project: true
  }
};
