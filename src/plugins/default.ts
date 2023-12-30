import type { Plugin } from "modules/plugin";
import { existsSync, readFileSync } from "fs";
import { resolvePath } from "mlly";
import { normalizeId } from "utils/id";

export default function PluginDefault(): Plugin {
  return {
    name: "nite:default",
    enforce: "post",

    async resolveId(id, importer) {
      try {
        // TODO: Add support for import aliases
        let abs = await resolvePath(id, { url: importer });
        if (abs.startsWith("node:")) return abs;
        let normalized = normalizeId(abs);
        if (existsSync(normalized)) return normalized;
        else return null;
      } catch {
        return null;
      }
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
