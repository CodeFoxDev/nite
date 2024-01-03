import type { ImportSpecifier } from "es-module-lexer";
import * as fs from "node:fs";
import * as path from "node:path";
import { build } from "esbuild";
import { normalizeid, resolvePathSync } from "mlly";
import { parse, init } from "es-module-lexer";
import { Once } from "utils/run";
import { Logger } from "utils/logger";
import { normalizeId, normalizeNodeHook } from "utils/id";

const logger = new Logger(["optimizer"]);
const dependencies = [];
const initEML = new Once();

export async function analyzeImports(code: string, id: string) {
  if (id.includes("node_modules")) return;
  initEML.run(async () => await init);

  const [imports] = parse(code);
  for (const i of imports) {
    let lib = code.slice(i.s, i.e);
    let isDynamic = false;
    // i.d > -1 indicates that it is a dynamic import, which can only be statically handled if it is a string, and not a variable
    // i.d === 2 indicates that it is an `import.meta`
    if (i.d > -1) {
      isDynamic = true;
      if (lib.startsWith(`'`) || lib.startsWith(`"`)) lib = lib.replaceAll(`'`, "").replaceAll(`"`, "");
      else continue;
    } else if (i.d === 2) {
      continue;
    }
    // Check for aliases
    if (lib.startsWith("/") || lib.startsWith(".") || lib.startsWith("#") || lib.startsWith("file://")) continue;
    if (normalizeid(lib).startsWith("node:")) continue;
    if (!dependencies.find((e) => e.name == lib)) {
      console.log(lib, id, code);
      const outFile = await bundleDep(lib, resolvePathSync(lib, { url: id }));
      dependencies.push({
        name: lib,
        bundled: outFile
      });
    }
    const bundledFile = dependencies.find((e) => e.name == lib)?.bundled;
    if (!bundledFile) continue;
    code = resolveBundledImport(code, i, normalizeNodeHook(bundledFile));
    //console.log(code);
    // Replace import to point to bundled file
  }
}

async function bundleDep(name: string, entry: string) {
  if (!fs.existsSync(path.resolve(process.cwd(), "node_modules/.nite")))
    fs.mkdirSync(path.resolve(process.cwd(), "node_modules/.nite"));
  const bundledDir = path.resolve(process.cwd(), "node_modules/.nite/bundled");
  if (!fs.existsSync(bundledDir)) fs.mkdirSync(bundledDir);
  const version = getVersion(entry);
  const outFile = path.resolve(bundledDir, `bundle-${name}@${version}.js`);
  if (fs.existsSync(outFile)) return outFile;
  try {
    const b = await build({
      entryPoints: [entry],
      outfile: outFile,
      bundle: true,
      minify: true,
      platform: "node",
      format: "esm",
      target: "node14",
      external: ["lightningcss"]
    });
    logger.info(`Optimized dependency ${name}`);
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
