import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules";
import { importsMap, analyzeImports } from "modules/optimizer";
import { Logger, warn } from "utils/logger";
import { Once } from "utils/run";

const logger = new Logger(["plugins", "optimizeDeps"]);

export default function PluginOptimizedDeps(config: ResolvedConfig): Plugin {
  return {
    name: "nite:optimizeDeps",
    enforce: "pre",

    async transform(src, id) {
      if (config.optimizeDeps.disabled === true) return;

      Once("optimizeDeps-warning", () =>
        warn("(!) The dependency optimizer is still experimental, usage may result in unexpected errors")
      );

      analyzeImports(src, id, config);

      const map = importsMap.find((e) => e.id == id);
      if (!map) return;
      let res = src;

      for (const val of await Promise.all(map.imports)) {
        if (!val) continue;
        const q = val.s.slice(val.i.s - val.i.ss - 1, val.i.s - val.i.ss); // Check if double or single quotes
        if (val.i.d > -1) res = res.replace(val.s, val.s.replace(val.l, `'${val.b}'`));
        else res = res.replace(val.s, val.s.substring(0, val.i.s - val.i.ss) + `${val.b}${q}`);
      }
      return res;
    }
  };
}
