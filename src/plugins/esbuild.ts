import { transform } from "esbuild";
import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules/plugin";
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
      if (id.includes("node_modules")) return;
      const cached = await this.cache.get(id);
      if (cached) return cached;
      const parsed = parseId(id);
      if (!parsed.loader) return;
      // TODO: improve speed (caching?)
      const transformed = await transform(src, {
        loader: parsed.loader
      });
      this.cache.set(id, transformed.code);
      // Log warnings
      // Add jsx inject
      //this.info(id);
      return {
        code: transformed.code
      };
    }
  };
}
