import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

export default defineConfig([
  {
    input: {
      cli: "src/cli.ts",
      index: "src/index.ts",
      loader: "src/loader.ts"
    },
    // Figure out how to include some modules (like cac)
    external: [
      "node:module",
      "node:worker_threads",
      "node:fs",
      "node:fs/promises",
      "node:path",
      "node:process",
      "node:perf_hooks",
      "dotenv",
      "magic-string",
      "esbuild",
      "mlly",
      "es-module-lexer",
      "@rollup/pluginutils",
      "cac",
      "picocolors"
    ],
    output: {
      dir: "dist",
      format: "es",
      exports: "named",
      preserveModules: true,
      preserveModulesRoot: "src"
    },
    plugins: [
      typescript(),
      commonjs({
        include: ["node_modules/**"]
      }),
      resolve()
    ]
  }
]);
