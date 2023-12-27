import { transform } from "esbuild";
import type { ResolvedConfig } from "../../config";
import type { Plugin } from "../plugin";
import { readFileSync } from "node:fs";
import { parseId } from "utils/id";

export default function PluginESBuild(): Plugin {
  let config: ResolvedConfig = {};

  return {
    name: "nite:esbuild",

    configResolved(_config) {
      config = _config;
    },

    async transform(src, id) {
      const parsed = parseId(id);
      if (!parsed.loader) return;
      // TODO: improve speed (caching?)
      const transformed = await transform(src, {
        loader: parsed.loader
      });
      // Log warnings
      // Add jsx inject
      //this.info(id);
      return {
        code: transformed.code
      };
    }
  };
}
