import type { ImportSpecifier } from "es-module-lexer";
import type { ResolvedConfig } from "config";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";
import { normalizeid, resolvePathSync } from "mlly";
import { parse, init } from "es-module-lexer";
import { Once } from "utils/run";
import { Logger } from "utils/logger";
import { normalizePath } from "utils/id";

const logger = new Logger(["optimizer"]);
const dependencies = [];
export const importsMap: { id: string; imports: Promise<replaceJob>[] }[] = [];

interface replaceJob {
  /** The full import statement (e.g. `import * as rollup from "rollup"`) */
  s: string;
  /** The library name (e.g. rollup) */
  l: string;
  /** The absolute url starting with file:/// of the bundled library file */
  b: string;
  i: ImportSpecifier;
}

export async function analyzeImports(code: string, id: string, config: ResolvedConfig) {
  if (id.includes("node_modules")) return;
  await Once("es-module-lexer", async () => await init);
  const [imports] = parse(code);

  if (imports.length == 0) return;
  const obj = { id, imports: [] };
  for (const i of imports) obj.imports.push(resolveImport(code, id, i, config));
  importsMap.push(obj);
}

async function resolveImport(
  code: string,
  id: string,
  i: ImportSpecifier,
  config: ResolvedConfig
): Promise<null | replaceJob> {
  let lib = code.slice(i.s, i.e);
  let isDynamic = false;

  if (i.d > -1) {
    // i.d > -1 indicates that it is a dynamic import, which can only be statically handled if it is a string, and not a variable
    isDynamic = true;
    if (lib.startsWith(`'`) || lib.startsWith(`"`)) lib = lib.replaceAll(`'`, "").replaceAll(`"`, "");
    else return;
  } else if (i.d === -2) {
    // i.d === 2 indicates that it is an `import.meta`
    return;
  }
  // Check for aliases
  if (lib.startsWith("/") || lib.startsWith(".") || lib.startsWith("#") || lib.startsWith("file://")) return;
  if (normalizeid(lib).startsWith("node:")) return;
  if (config.optimizeDeps.exclude.includes(lib)) return;
  // Bundle dep if it doesn't exist already
  if (!dependencies.find((e) => e.name == lib)) {
    const outFile = await bundleDep(lib, resolvePathSync(lib, { url: id }), config);
    dependencies.push({
      name: lib,
      bundled: outFile
    });
  }
  // Replace import to point to bundled file
  const bundledFile = dependencies.find((e) => e.name == lib)?.bundled;
  if (!bundledFile) return;
  return {
    s: code.slice(i.ss, i.se),
    l: code.slice(i.s, i.e),
    b: normalizePath(path.relative(id, bundledFile)),
    i
  };
}

async function bundleDep(name: string, entry: string, config: ResolvedConfig) {
  const s = performance.now();
  const bundledDir = path.resolve(process.cwd(), "node_modules/.nite");
  if (!fs.existsSync(bundledDir)) fs.mkdirSync(bundledDir);
  const version = getVersion(entry);
  const outFile = path.resolve(bundledDir, `dep-${name}@${version}.js`);
  if (fs.existsSync(outFile)) return outFile;
  try {
    const b = await build({
      entryPoints: [entry],
      outfile: outFile,
      ...config.optimizeDeps.esbuildOptions
    });
    logger.info(`Optimized dependency ${name}, in ${performance.now() - s} ms`);
    return outFile;
  } catch (e) {
    logger.error(`Failed to bundle dependency, esbuild error: \n`, e);
    return null;
  }
}

function getVersion(entry: string) {
  const res = /\/([a-zA-Z-_]*?)@([0-9a-zA-Z.]*?)[\/_]/.exec(entry);
  return res[2];
}
