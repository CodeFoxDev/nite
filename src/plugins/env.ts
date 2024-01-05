import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules";
import { parse, init } from "es-module-lexer";
import { Once } from "utils/run";
import { loadEnv } from "env";

export default function PluginENV(config: ResolvedConfig): Plugin {
  const vmodId = "virtual:nite-env";
  const vmodIdResolved = "\0" + vmodId;

  return {
    name: "nite:json",

    resolveId(source, importer) {
      if (source == vmodId) return vmodIdResolved;
    },

    load(id) {
      if (id != vmodIdResolved) return;
      const s = loadEnv(config.mode, config.envDir);
      return `export function loadEnv() { return JSON.parse('${JSON.stringify(s)}'); }`;
    },

    // TODO: Also load into process.env object
    async transform(src, id) {
      await Once("es-module-lexer", async () => await init);
      const [imports] = parse(src);
      for (const i of imports) {
        if (i.d !== -2) continue;
        // Load env if import.meta is used somewhere
        return `import { loadEnv as __nite_loadenv } from '${vmodId}'; import.meta.env = __nite_loadenv(); ${src}`;
      }
    }
  };
}
