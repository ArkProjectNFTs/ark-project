import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json"; // Import the JSON plugin
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

export default [
  {
    input: "index.tsx",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true
      },
      {
        file: "dist/index.mjs",
        format: "esm",
        sourcemap: true
      }
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        preferBuiltins: false
      }),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" }),
      terser({ compress: { directives: false } }),
      json() // Add the JSON plugin to your plugins array
    ],
    external: ["react", "react-dom"]
  },
  {
    input: "index.tsx",
    output: [{ file: "dist/types.d.ts", format: "es" }],
    plugins: [dts()]
  }
];
