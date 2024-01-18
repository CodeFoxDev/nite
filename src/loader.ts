import type { ResolveHookContext, LoadHookContext, ResolveFnOutput, LoadFnOutput, ModuleFormat } from "node:module";
import type { MessagePort } from "node:worker_threads";
import type { ResolvedConfig } from "config";
import type { ModuleGraph, PluginContainer } from "modules";
import type { NiteDevServer } from "server";
import type * as rollup from "rollup";
import { performance } from "node:perf_hooks";
import { createServer } from "server";
import { FileUrl, isVirtual, normalizeId, normalizeNodeHook } from "utils";
import { detectSyntax } from "mlly";

export type nextResolve = (
  specifier: string,
  context?: ResolveHookContext
) => ResolveFnOutput | Promise<ResolveFnOutput>;
export type nextLoad = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

export interface MessagePortData {
  initialized: number;
}

export interface MessagePortValue {
  event: keyof MessagePortData;
  data: any;
}

let server: NiteDevServer;
let container: PluginContainer;
let baseImporter: string;
let config: ResolvedConfig;

// Initialize the server in an async block, to avoid top-level await
async function init() {
  const first = Date.now();
  server = await createServer({});
  container = server.pluginContainer;
  return Date.now() - first;
}

const _i = init();

export async function initialize({
  _port,
  _config,
  _importer
}: {
  _port: MessagePort;
  _config: ResolvedConfig;
  _importer: string;
}) {
  baseImporter = _importer;
  config = _config;
  if (container) _port.postMessage("initialized");
  _i.then((val) => {
    const data: MessagePortValue = {
      event: "initialized",
      data: val
    };
    _port.emit("message", data);
  });
  // TODO: Allow messageBus to interact with pluginContainer
}

export async function resolve(
  specifier: string,
  context: ResolveHookContext,
  nextResolve: nextResolve
): Promise<ResolveFnOutput> {
  const s = performance.now();
  // Temporary implementation of ?node query
  if (!container) return nextResolve(specifier);
  if (specifier.endsWith("?node")) return nextResolve(specifier.replace("?node", ""));

  const importer = context.parentURL === baseImporter ? undefined : normalizeId(context.parentURL);
  // Inject resolveId hooks
  const res = await container.resolveId(normalizeId(specifier), importer);
  if (!res || (typeof res == "object" && !res.id)) return nextResolve(specifier);
  let id = typeof res == "string" ? res : res.id;

  // Add total time to the moduleGraph
  const mod = server.moduleGraph.getModulesByFile(id);
  if (mod) mod.nodeResolveTime = performance.now() - s;

  return {
    shortCircuit: true,
    url: normalizeNodeHook(id),
    format: id.startsWith("node:") ? "builtin" : undefined
  };
}

export async function load(url: string, context: LoadHookContext, nextLoad: nextLoad): Promise<LoadFnOutput> {
  const s = performance.now();
  // Temporary implementation of ?node query
  if (!container) return nextLoad(url, context);
  if (url.endsWith("?node")) return nextLoad(url.replace("?node", ""), context);

  // Inject load hooks
  const id = normalizeId(url);
  const lRes = await container.load(id);
  if (!lRes) return nextLoad(url, context);
  let source = typeof lRes == "string" ? lRes : lRes.code;

  const mod = server.moduleGraph.getModulesByFile(id);
  const cached = mod.getCachedModule();
  const isSame = mod.compareCachedModule();
  if (cached !== null && isSame === true && !isVirtual(id)) {
    const sRes = await container.shouldTransformCachedModule({ code: source, id });
    if (sRes !== true) {
      const cachedCode = await cached.loadCache();
      //console.log(cached, id, cachedCode !== null);
      //console.log(`skipped id: ${id}`);
      return {
        shortCircuit: true,
        format: determineFormat(url, context, cachedCode),
        source: cachedCode
      };
    }
  }

  // Inject transform hooks
  const tRes = await container.transform(source, id);
  if (!tRes)
    return {
      shortCircuit: true,
      format: determineFormat(url, context, source),
      source
    };

  source = typeof tRes == "string" ? tRes : tRes.code;
  const format = determineFormat(url, context, source);

  // Add total time to the moduleGraph
  if (mod) mod.nodeLoadTime = performance.now() - s;
  return {
    shortCircuit: true,
    format,
    source
  };
}

// TODO: Implement this in the FileUrl class
// TODO: Add support for json, builtin, wasm
// https://www.npmjs.com/package/mlly
function determineFormat(url: string, context: LoadHookContext, src: string): ModuleFormat {
  // Check if context.format is set
  if (context.format) return context.format;
  const file = new FileUrl(url);
  // Check extension
  if (file.ext == "mjs" || file.ext == "mts") return "module";
  else if (file.ext == "cjs" || file.ext == "cts") return "commonjs";
  // Search for `import ... from` or `import "..."` statements
  const syntax = detectSyntax(src);
  if (!syntax.isMixed && syntax.hasESM) return "module";
  else if (!syntax.isMixed && syntax.hasCJS) return "commonjs";
  else return "module";
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}
