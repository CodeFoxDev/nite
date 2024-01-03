import type { Plugin } from "modules";
import { existsSync, readFileSync } from "fs";
import { resolvePath } from "mlly";
import { normalizeId } from "utils/id";

export default function PluginDefault(): Plugin {
  return {
    name: "nite:default",
    enforce: "post",

    async resolveId(id, importer) {
      const normal = await resolve(id, importer);
      if (normal) return normal;
      // TODO: Implement ts resolution algorithm instead of guessing
      // Check if it has extension, else try it with .ts extension
      const seg = id.split("/");
      const es = seg[seg.length - 1].split(".");
      if (es.length > 1 && es[es.length - 1] != "") return null;
      else return resolve(`${id}.ts`, importer);
    },

    load(id) {
      if (id.startsWith("node:")) return null; // If the default is null, it will trigger nodejs' loadhook, which will properly resolve `node:*`
      try {
        const src = readFileSync(id, { encoding: "utf-8" });
        return src;
      } catch (e) {
        this.error(`Failed to load file: ${id}, fs.readFileSync error:`, e);
        return null;
      }
    }
  };
}

async function resolve(id: string, importer: string) {
  try {
    // TODO: Add support for import aliases
    let abs = await resolvePath(id, { url: importer });
    if (abs.startsWith("node:")) return abs;
    let normalized = normalizeId(abs);
    if (existsSync(normalized)) return normalized;

    return null;
  } catch {
    return null;
  }
}
