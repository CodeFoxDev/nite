import type { ResolvedConfig } from "../config";
import type { Plugin } from "../modules/plugin";
import { build } from "esbuild";
import { ImportSpecifier, parse } from "es-module-lexer";
import { normalizeid, resolvePathSync } from "mlly";
import { resolve } from "path";
import { Logger } from "utils/logger";

const logger = new Logger(["plugins", "optimizedDeps"]);

interface bundled {
  name: string;
  bundled: string;
}

export default function PluginOptimizedDeps(): Plugin {
  let config: ResolvedConfig = {};
  let libs: bundled[] = [];

  return {
    name: "nite:optimizedDeps",
    enforce: "pre",

    configResolved(_config) {
      config = _config;
    },

    async transform(src, id) {
      return; // Temporarily disabled
      if (id.includes("node_modules")) return;
      let res: string = src;

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
        if (lib.startsWith("/") || lib.startsWith(".") || lib.startsWith("#") || lib.startsWith("file://")) continue;
        const normal = normalizeid(resolvePathSync(lib, { url: id }));
        if (normal.startsWith("node:")) continue;
        // Bundle dep if not already
        if (!libs.find((e) => e.name == lib)) {
          const res = preBundleLib(lib, normal.replace("file://", ""));
          if (!res) continue;
          libs.push({
            name: lib,
            bundled: normal
          });
        }
        // TODO: Check if not already prebundled
        res = resolveBundledImport(src, i, normal);
      }
      //if (!id.includes("node_modules")) console.log(libs);
      return {
        code: res
      };
    }
  };
}

async function preBundleLib(name: string, entry: string) {
  try {
    const b = await build({
      entryPoints: [entry],
      outfile: resolve(process.cwd(), "node_modules/.nite/temp", `dep-${name}.js`),
      bundle: true,
      minify: true,
      platform: "node",
      format: "esm",
      target: "node14",
      external: ["lightningcss"]
    });
    logger.info(`Succesfully prebundled ${name}`);
    return b;
  } catch (err) {
    logger.error(`Failed to prebundle ${name}, esbuild error:`);
    console.log(err);
    return false;
  }
}

function resolveBundledImport(src: string, i: ImportSpecifier, bundled: string): string {
  let res = src;
  const org = src.slice(i.ss, i.se);
  const c = org.substring(i.s - i.ss - 1, i.s - i.ss);
  let newImport = org.substring(0, i.s - i.ss) + `${bundled}${c}`;
  if (i.d > -1) newImport = org.replace(src.slice(i.s, i.e), `'${bundled}'`);
  res = src.replace(org, newImport);
  //res = res.substring(0, i.se)
  return res;
}
