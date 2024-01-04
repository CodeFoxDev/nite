import type { ImportSpecifier } from "es-module-lexer";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";
import { normalizeid, resolvePathSync } from "mlly";
import { parse, init } from "es-module-lexer";
import { Once } from "utils/run";
import { Logger } from "utils/logger";
import { normalizeId, normalizeNodeHook, normalizePath } from "utils/id";

const logger = new Logger(["optimizer"]);
const dependencies = [];
const initEML = new Once();

interface replaceJob {
  /** The full import statement (e.g. `import * as rollup from "rollup"`) */
  statement: string;
  /** The library name (e.g. rollup) */
  library: string;
  /** The absolute url starting with file:/// of the bundled library file */
  bundledLibrary: string;
}

export async function analyzeImports(code: string, id: string) {
  if (id.includes("node_modules")) return code;
  initEML.run(async () => await init);
  const [imports] = parse(code);
  let res: string = code;

  const r = await new Promise((resolve) => {
    if (imports.length == 0) return resolve("");
    let c = 0;
    for (const i of imports) {
      resolveImport(code, id, i).then((val) => {
        if (val) {
          const q = val.statement.slice(i.s - i.ss - 1, i.s - i.ss); // Check if double or single quotes
          if (i.d > -1) res = res.replace(val.statement, val.statement.replace(val.library, `'${val.bundledLibrary}'`));
          else res = res.replace(val.statement, val.statement.substring(0, i.s - i.ss) + `${val.bundledLibrary}${q}`);
        }
        if (c == imports.length - 1) return resolve("");
        c++;
      });
    }
  });

  return res;
}

async function resolveImport(code: string, id: string, i: ImportSpecifier): Promise<null | replaceJob> {
  let lib = code.slice(i.s, i.e);
  let isDynamic = false;

  if (i.d > -1) {
    // i.d > -1 indicates that it is a dynamic import, which can only be statically handled if it is a string, and not a variable
    isDynamic = true;
    if (lib.startsWith(`'`) || lib.startsWith(`"`)) lib = lib.replaceAll(`'`, "").replaceAll(`"`, "");
    else return;
  } else if (i.d === 2) {
    // i.d === 2 indicates that it is an `import.meta`
    return;
  }
  // Check for aliases
  if (lib.startsWith("/") || lib.startsWith(".") || lib.startsWith("#") || lib.startsWith("file://")) return;
  if (normalizeid(lib).startsWith("node:")) return;
  // Bundle dep if it doesn't exist already
  if (!dependencies.find((e) => e.name == lib)) {
    const outFile = await bundleDep(lib, resolvePathSync(lib, { url: id }));
    dependencies.push({
      name: lib,
      bundled: outFile
    });
  }
  // Replace import to point to bundled file
  const bundledFile = dependencies.find((e) => e.name == lib)?.bundled;
  if (!bundledFile) return;
  return {
    statement: code.slice(i.ss, i.se),
    library: code.slice(i.s, i.e),
    bundledLibrary: resolveImportPath(id, bundledFile)
  };
}

function resolveImportPath(from: string, to: string): string {
  const t = normalizePath(path.relative(from, to));
  return t;
}

async function bundleDep(name: string, entry: string) {
  const s = performance.now();
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
      minify: false,
      platform: "node",
      format: "esm",
      target: "esnext",
      external: ["lightningcss"],
      plugins: [],
      banner: {
        js: `import { createRequire as __nite_createRequire } from 'node:module';
import { fileURLToPath as __nite_fileUrlToPath } from 'node:url';
const require = __nite_createRequire(import.meta.url);
const __filename = __nite_fileUrlToPath(import.meta.url);
const __dirname = __nite_fileUrlToPath(new URL('.', import.meta.url));`
      },
      outExtension: {
        ".js": ".mjs"
      }
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
