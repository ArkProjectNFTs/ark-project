/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "@ark-project/eslint-config/react-internal.js",
    "next",
    "next/core-web-vitals"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true
  }
};
