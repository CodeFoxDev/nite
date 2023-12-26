import { transform } from "esbuild";
import type { ResolvedConfig } from "../../config";
import type { Plugin } from "../plugin";
import { readFileSync } from "node:fs";

export default function PluginESBuild(): Plugin {
  let config: ResolvedConfig = {};

  return {
    name: "nite:esbuild",
    enforce: "pre",

    configResolved(_config) {
      config = _config;
    },

    resolveId(id, importer) {
      //console.log(id);
      //if (id.endsWith("ts")) return { id };
    },

    load(id) {
      //if (!id.endsWith("ts")) return;
      if (!id.startsWith("C:/")) return;
      const src = readFileSync(id, { encoding: "utf-8" });
      return {
        code: src
      };
    },

    async transform(src, id) {
      if (!id.endsWith("ts")) return;
      //this.info(id);
      return {
        code: "// Transformed by: nite:esbuild \n" + src
      };
    }
  };
}
