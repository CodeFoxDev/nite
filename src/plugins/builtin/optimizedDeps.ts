import type { ResolvedConfig } from "../../config";
import type { Plugin } from "../plugin";
import { parse } from "es-module-lexer";

export default function PluginOptimizedDeps(): Plugin {
  let config: ResolvedConfig = {};

  return {
    name: "nite:optimizedDeps",
    enforce: "pre",

    configResolved(_config) {
      config = _config;
    },

    async transform(src, id) {
      let m: RegExpExecArray;
      let c = 0;
      let moduleTree = {
        id,
        imports: []
      };

      const [imports, exports, facade] = await parse(src, id);
      for (const i of imports) {
        let lib = src.slice(i.s, i.e);
        let isDynamic = false;
        if (lib.startsWith("import.")) continue;
        // i.d > -1 indicates that it is a dynamic import, which can only be statically handled if it is a string, and not a variable
        else if (i.d > -1) {
          isDynamic = true;
          if (lib.startsWith(`'`) || lib.startsWith(`"`)) lib = lib.replaceAll(`'`, "").replaceAll(`"`, "");
          else continue;
        }
        const resolvedId = await this.resolve(lib, id);
        moduleTree.imports.push({
          imported: lib,
          resolved: typeof resolvedId != "object" ? resolvedId : resolvedId?.id,
          dynamic: isDynamic
        });
      }
    }
  };
}
