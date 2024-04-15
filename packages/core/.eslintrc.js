/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@ark-project/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  ignorePatterns: ["rollup.config.mjs"],
  env: {
    mocha: true
  },
  plugins: ["mocha"],
  parserOptions: {
    project: true
  }
};
