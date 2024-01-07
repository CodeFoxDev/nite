import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules";
import * as path from "node:path";
import * as fs from "node:fs";
import MagicString from "magic-string";
import { parse, init } from "es-module-lexer";
import { Once } from "utils/run";
import { normalizePath, getExtension, normalizeNodeHook } from "utils/id";
import { loadEnv } from "env";

export default function PluginAlias(config: ResolvedConfig): Plugin {
  const { root } = config;

  return {
    name: "nite:alias",

    resolveId(source, importer) {},

    async transform(src, id) {
      await Once("es-module-lexer", async () => await init);

      const s = new MagicString(src);

      // TODO: maybe add builtin function for this, to avoid parsing multiple times (also in nite:env)
      const [imports] = parse(src);
      for (const i of imports) {
        if (i.d === -2) continue;
        const lib = src.slice(i.s, i.e);
        if (lib.startsWith(".") || lib.startsWith("/")) continue;
        // try resolving it to root
        const res = tryResolve(root, lib);
        if (!res) continue;
        s.update(i.s, i.e, relativeResolve(id, res));
      }
      const r = s.toString();
      if (!s.hasChanged()) return;
      return r;
    }
  };
}

/**
 * @param dext Fallback extension if none are provided, defaults to ts
 */
function tryResolve(root: string, to: string, dext: string = "ts") {
  let res = normalizePath(path.resolve(root, to));
  let ext = getExtension(res);
  if (!ext) res = `${res}.${dext}`;
  if (fs.existsSync(res)) return res;
  else return null; // Other methods to try?
}

function relativeResolve(from: string, to: string) {
  let s = path.relative(path.dirname(from), to);
  if (!s.startsWith(".")) s = `./${s}`;
  return normalizePath(s);
}
