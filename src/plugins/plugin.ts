import type * as rollup from "rollup";
import type { ResolvedConfig, UserConfig } from "config";
import { Logger } from "utils/logger";
import { getBuiltinPlugins } from "./builtins";
import { createPluginContainer } from "./container";

const logger = new Logger(["plugins", "container"]);

export function initializePlugins(config: UserConfig) {
  const plugins = loadPlugins(config);
  const _sorted = sortPlugins(plugins);
  const container = createPluginContainer(_sorted, config);
  logger.info("Created plugin container succesfully");
  return container;
}

export function loadPlugins(config: UserConfig): Plugin[] {
  const configPlugins = config.plugins ?? [];
  const builtinPlugins = getBuiltinPlugins();
  return [...configPlugins, ...builtinPlugins];
}

export function sortPlugins(plugins: Plugin[]): Plugin[] {
  let sorted = [[], [], [], [], [], []];

  for (const plugin of plugins) {
    const enfore = plugin.enforce == "pre" ? 0 : plugin.enforce == "post" ? 4 : 2;
    const builtin = plugin.name.startsWith("nite:") ? 1 : 0;
    const index = enfore + builtin;
    sorted[index].push(plugin);
  }
  return sorted.flat(2);
}

export type Hook = "config" | "configResolved" | "resolveId" | "load" | "transform";
export type Format = "commonjs" | "module";

export interface Plugin /*  extends rollup.Plugin */ {
  name: string;
  version?: string;
  enforce?: "pre" | "post";
  apply?: "dev" | "build"; // Also allow function? (like vite)
  debug?: boolean;

  /**
   * Hook to modify the config, return an object to merge config,
   * or change the config parameter directly to mutate.
   */
  config?: PluginHook<ConfigHook>;
  /**
   * The final resolved config
   */
  configResolved?: PluginHook<ConfigResolvedHook>;
  /** */
  resolveId?: PluginHook<ResolveIdHook>;
  load?: PluginHook<LoadHook>;
  transform?: PluginHook<TransformHook>;
}

export type SortedPlugin = {
  name: string;
  version?: string;
  enforce?: "pre" | "post";
  apply?: "dev" | "build"; // Also allow function? (like vite)
  debug?: boolean;

  /**
   * Hook to modify the config, return an object to merge config,
   * or change the config parameter directly to mutate.
   */
  config?: ConfigHook;
  /**
   * The final resolved config
   */
  configResolved?: ConfigResolvedHook;
  /** */
  resolveId?: ResolveIdHook;
  load?: LoadHook;
  transform?: TransformHook;
};

// Accessed by the `this` property in a plugin hook
// https://rollupjs.org/plugin-development/#plugin-context
export interface PluginContext {
  // Logging
  //debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...msg: string[]): void;

  // Metadata from rollup (and potentially from nite?)
  meta: {
    rollupVersion: string;
    watchMode: boolean;
  };

  /* parse(
    code: string,
    options?: {
      allowReturnOutsideFunction?: boolean;
    }
  ); */

  // Methods
  /* resolve(id: string, importer?: string, options?: { skipSelf?: boolean; isEntry?: boolean }): rollup.ResolvedId;
  load(options: { id: string }): Promise<rollup.ModuleInfo>; */
}

export interface PluginContainer {
  ctx: PluginContext;

  // Config
  config(config: UserConfig, env: { mode: string; command: string }): UserConfig | null | void;
  configResolved(config: ResolvedConfig): void;
  // File hooks
  resolveId(id: string, importer: string | undefined, _skip?: Array<SortedPlugin>): Promise<rollup.ResolveIdResult>;
  load(id: string): Promise<rollup.LoadResult>;
  transform(code: string, id: string): Promise<rollup.TransformResult>;
}

export type ConfigHook = (this: PluginContext, config: UserConfig, env: { mode: string; command: string }) => UserConfig | null | void;
export type ConfigResolvedHook = (this: PluginContext, config: UserConfig) => void;

export type ResolveIdHook = (
  this: PluginContext,
  source: string,
  importer: string | undefined,
  options: { isEntry: boolean }
) => PromiseOpt<string | null | void | false | { id: string; format?: Format }>;
export type LoadHook = (this: PluginContext, id: string) => PromiseOpt<string | null | void | { code: string; format?: Format }>;
export type TransformHook = (this: PluginContext, source: string, id: string) => PromiseOpt<string | null | void | { code: string; format?: Format }>;

export type SortedPlugins = SortedPlugin[];

type PluginHook<T> = T | { handler: T; enforce?: "pre" | "post" };
type PromiseOpt<T> = T | Promise<T>;
