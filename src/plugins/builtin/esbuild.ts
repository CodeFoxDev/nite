import { transform } from "esbuild";
import type { ResolvedConfig } from "../../config";
import type { Plugin } from "../plugin";

export default function PluginESBuild(): Plugin {
  let config: ResolvedConfig = {};

  return {
    name: "nite:esbuild",

    configResolved(_config) {
      config = _config;
    },

    resolveId(id, importer) {
      //console.log(id);
      //if (id.endsWith("ts")) return { id };
    },

    load(id) {},

    async transform(src, id) {
      //this.info(id);
      return "// Transformed by: nite:esbuild \n" + src;
    }
  };
}
