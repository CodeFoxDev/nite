// Runs off of main thread
import type { ResolveHookContext, LoadHookContext, ResolveFnOutput, LoadFnOutput } from "node:module";

type nextResolve = (specifier: string, context?: ResolveHookContext) => ResolveFnOutput | Promise<ResolveFnOutput>;
type nextLoad = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

export async function resolve(specifier: string, context: ResolveHookContext, nextResolve: nextResolve) {
  const { parentURL = null } = context;

  // Inject resolveId hooks

  return nextResolve(specifier);
}

export async function load(url: string, context: LoadHookContext, nextLoad: nextLoad) {
  console.log(url);

  // Inject load hooks

  // Inject transform hooks

  return nextLoad(url);
}