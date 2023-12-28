import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";

export default defineConfig([
  {
    input: {
      index: "src/index.ts",
      "loader/index": "src/loader/index.ts",
      "loader/hooks": "src/loader/hooks.ts"
    },
    external: ["node:module", "node:worker_threads", "node:fs", "node:path", "node:process", "esbuild", "@rollup/pluginutils"],
    output: {
      dir: "dist",
      format: "es",
      exports: "named",
      preserveModules: true
    },
    plugins: [typescript()]
  }
]);
