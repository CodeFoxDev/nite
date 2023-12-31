import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules";
import { resolve } from "node:path";
import { parseId } from "utils/id";
import { dataToEsm } from "@rollup/pluginutils";

export default function PluginESBuild(config: ResolvedConfig): Plugin {
  return {
    name: "nite:json",

    // Resolve json file so node doesn't give a warning that importing json is experimental
    resolveId(source, importer) {
      const parsed = parseId(source);
      if (!parsed) console.log(source, parsed);
      if (parsed.ext != "json") return;
      return resolve(importer, "../", source);
    },

    // Transform to add (subpath) exports, which helps with tree-shaking
    transform(src, id) {
      const parsedId = parseId(id);
      if (parsedId.ext != "json") return;
      try {
        if (config.json.stringify) {
          return {
            code: `export default JSON.parse(${JSON.stringify(src)})`
          };
        }

        const parsed = JSON.parse(src);
        return {
          code: dataToEsm(parsed, {
            preferConst: true,
            namedExports: true // Add option for this?
          })
        };
      } catch (e) {
        const pos = extractJsonErrorPosition(e.message, src.length);
        const msg = pos ? `, invalid JSON syntax found at position ${pos}` : `.`;
        this.error(`Failed to parse JSON file` + msg);
      }
    }
  };
}

export function extractJsonErrorPosition(e: string, inputLength: number): number | undefined {
  if (e.startsWith("Unexpected end of JSON input")) return inputLength - 1;

  const errorMessageList = /at position (\d+)/.exec(e);
  return errorMessageList ? Math.max(parseInt(errorMessageList[1], 10) - 1, 0) : undefined;
}
