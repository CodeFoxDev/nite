import type { ResolveHookContext, LoadHookContext, ResolveFnOutput, LoadFnOutput, ModuleFormat } from "node:module";
import type { MessagePort } from "node:worker_threads";
import type { PluginContainer } from "modules";
import type { NiteDevServer } from "server";
import { createServer } from "server";
import { FileUrl, normalizeId, normalizeNodeHook } from "utils/id";
import { detectSyntax } from "mlly";

export type nextResolve = (
  specifier: string,
  context?: ResolveHookContext
) => ResolveFnOutput | Promise<ResolveFnOutput>;
export type nextLoad = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

let server: NiteDevServer;
let container: PluginContainer;

// Initialize the server in an async block, to avoid top-level await
(async function () {
  server = await createServer({});
  container = server.pluginContainer;
})();

export async function resolve(
  specifier: string,
  context: ResolveHookContext,
  nextResolve: nextResolve
): Promise<ResolveFnOutput> {
  const { parentURL = null } = context;
  if (!container) return nextResolve(specifier);
  const res = await container.resolveId(
    normalizeId(specifier),
    parentURL != undefined ? normalizeId(parentURL) : undefined
  );
  // Let nodejs resolve if nothing is returned
  if (!res || (typeof res == "object" && !res.id)) return nextResolve(specifier);
  let id = typeof res == "string" ? res : res.id;

  return {
    shortCircuit: true,
    url: normalizeNodeHook(id),
    format: id.startsWith("node:") ? "builtin" : undefined
  };
}

export async function load(url: string, context: LoadHookContext, nextLoad: nextLoad): Promise<LoadFnOutput> {
  // Inject load hooks
  if (!container) return nextLoad(url, context);
  let lRes = await container.load(normalizeId(url));
  if (!lRes) return nextLoad(url, context);
  // Inject transform hooks
  let source = typeof lRes == "string" ? lRes : lRes.code;
  let tRes = await container.transform(source, normalizeId(url));
  const tempSrc =
    typeof tRes == "string" ? tRes : !tRes || (typeof tRes == "object" && !tRes.code) ? source : tRes.code;
  const format = determineFormat(url, context, tempSrc);

  // Return correct code
  if (!tRes || (typeof tRes == "object" && !tRes.code)) return { shortCircuit: true, format, source };
  source = tempSrc;

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
