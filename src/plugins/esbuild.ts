import { transform } from "esbuild";
import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules";
import { readFileSync } from "node:fs";
import { parseId } from "utils/id";

export default function PluginESBuild(config: ResolvedConfig): Plugin {
  return {
    name: "nite:esbuild",

    async transform(src, id) {
      if (id.includes("node_modules")) return;
      const parsed = parseId(id);
      if (!parsed.loader) return;
      // TODO: improve speed (caching?)
      try {
        const transformed = await transform(src, {
          loader: parsed.loader
        });
        return {
          code: transformed.code
        };
      } catch (e) {
        console.log(id);
        console.log(e);
      }
      // Log warnings
      // Add jsx inject
      //this.info(id);
    }
  };
}
