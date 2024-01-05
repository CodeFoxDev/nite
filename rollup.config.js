import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";

export default defineConfig([
  {
    input: {
      index: "src/index.ts",
      "loader/register": "src/loader/register.ts",
      "loader/index": "src/loader/index.ts"
    },
    external: [
      "node:module",
      "node:worker_threads",
      "node:fs",
      "node:fs/promises",
      "node:path",
      "node:process",
      "node:perf_hooks",
      "dotenv",
      "esbuild",
      "mlly",
      "es-module-lexer",
      "@rollup/pluginutils"
    ],
    output: {
      dir: "dist",
      format: "es",
      exports: "named",
      preserveModules: true
    },
    plugins: [typescript(), nodeResolve()]
  }
]);
