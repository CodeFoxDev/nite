// Runs off of main thread
import type { ResolveHookContext, LoadHookContext, ResolveFnOutput, LoadFnOutput } from "node:module";
import type { MessagePort } from "node:worker_threads";
import { readConfig } from "config";
import { PluginContainer, initializePlugins } from "plugins/plugin";
import { Logger, PartialLogger } from "utils/logger";
import { FileUrl } from "utils/extension";
import { packageJSON } from "utils/package";

type nextResolve = (specifier: string, context?: ResolveHookContext) => ResolveFnOutput | Promise<ResolveFnOutput>;
type nextLoad = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

const logger = new PartialLogger(["loader"]);
let container: PluginContainer | null;

export async function initialize({ number, port }: { number: number; port: MessagePort }) {
  const config = await readConfig();
  if (config == false) {
    port.postMessage("Error when loading config, quitting...");
    return;
  }
  container = initializePlugins(config);
}

export async function resolve(specifier: string, context: ResolveHookContext, nextResolve: nextResolve): Promise<ResolveFnOutput> {
  const { parentURL = null } = context;
  if (!container) return nextResolve(specifier);
  const res = await container.resolveId(specifier, parentURL);
  if (res != null && typeof res == "object")
    return {
      shortCircuit: true,
      url: res.id
    };

  // Inject resolveId hooks

  return nextResolve(specifier);
}

export async function load(url: string, context: LoadHookContext, nextLoad: nextLoad): Promise<LoadFnOutput> {
  // Inject load hooks
  if (!container) return nextLoad(url, context);
  const cUrl = url.replace("file:///", "");
  let lRes = await container.load(cUrl);
  if (!lRes) return nextLoad(url, context);

  // Inject transform hooks
  let source = typeof lRes == "string" ? lRes : lRes.code;
  const format = determineFormat(url, context, source);
  let tRes = await container.transform(source, url);

  // Return correct code
  if (!tRes || (typeof tRes == "object" && !tRes.code)) return { shortCircuit: true, format, source };
  source = typeof tRes == "string" ? tRes : tRes.code;

  return {
    shortCircuit: true,
    format,
    source
  };
}

const MODULE_REGEX = /import.*?(from|".*?")/g;
const COMMONJS_REGEX = /require\(.*?\)/g;

// TODO: Implement this in the FileUrl class
// TODO: Add support for json, builtin, wasm
function determineFormat(url: string, context: LoadHookContext, src: string) {
  // Check if context.format is set
  if (context.format) return context.format;
  const file = new FileUrl(url);
  // Check extension
  if (file.ext == "mjs" || file.ext == "mts") return "module";
  else if (file.ext == "cjs" || file.ext == "cts") return "commonjs";
  // Search for `import ... from` or `import "..."` statements
  if (MODULE_REGEX.test(src)) return "module";
  else if (packageJSON().type == "module") return "module";
  else return "commonjs";
}

/* function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
} */
