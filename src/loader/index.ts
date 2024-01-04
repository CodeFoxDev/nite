import type { ResolveHookContext, LoadHookContext, ResolveFnOutput, LoadFnOutput, ModuleFormat } from "node:module";
import type { MessagePort } from "node:worker_threads";
import type * as rollup from "rollup";
import type { PluginContainer } from "modules";
import type { NiteDevServer } from "server";
import { performance } from "node:perf_hooks";
import { createServer } from "server";
import { FileUrl, normalizeId, normalizeNodeHook } from "utils/id";
import { Logger } from "utils/logger";
import { detectSyntax } from "mlly";

export type nextResolve = (
  specifier: string,
  context?: ResolveHookContext
) => ResolveFnOutput | Promise<ResolveFnOutput>;
export type nextLoad = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

const logger = new Logger(["loader"]);
let server: NiteDevServer;
let container: PluginContainer;

// Initialize the server in an async block, to avoid top-level await
async function init() {
  const first = Date.now();
  server = await createServer({});
  container = server.pluginContainer;
  logger.info(`Started dev server in ${Date.now() - first} ms`);
}

const _i = init();

export async function initialize({ number, port }: { number: number; port: MessagePort }) {
  if (container) port.postMessage("initialized");
  _i.then(() => port.postMessage("initialized"));
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

  // Inject resolveId hooks
  const res = await container.resolveId(normalizeId(specifier), normalizeId(context.parentURL));
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
  const lRes = await container.load(normalizeId(url));
  if (!lRes) return nextLoad(url, context);
  let source = typeof lRes == "string" ? lRes : lRes.code;

  // Inject transform hooks
  const tRes = await container.transform(source, normalizeId(url));
  if (!tRes)
    return {
      shortCircuit: true,
      format: determineFormat(url, context, source),
      source
    };

  source = typeof tRes == "string" ? tRes : tRes.code;
  const format = determineFormat(url, context, source);

  // Add total time to the moduleGraph
  const mod = server.moduleGraph.getModulesByFile(normalizeId(url));
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
