// Runs off of main thread
import type { ResolveHookContext, LoadHookContext, ResolveFnOutput, LoadFnOutput } from "node:module";
import type { MessagePort } from "node:worker_threads";
import { readConfig } from "config";
import { PluginContainer, initializePlugins } from "plugins/plugin";
import * as path from "node:path";

type nextResolve = (specifier: string, context?: ResolveHookContext) => ResolveFnOutput | Promise<ResolveFnOutput>;
type nextLoad = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

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
  if (container) {
    const res = await container.resolveId(specifier, parentURL);
    if (res != null && typeof res == "object")
      return {
        shortCircuit: true,
        url: res.id
      };
  }

  // Inject resolveId hooks

  return nextResolve(specifier);
}

export async function load(url: string, context: LoadHookContext, nextLoad: nextLoad): Promise<LoadFnOutput> {
  if (container) {
    const res = await container.load(url);
  }
  // Inject load hooks

  // Inject transform hooks

  return nextLoad(url);
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}
