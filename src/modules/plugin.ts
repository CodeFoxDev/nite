import type * as rollup from "rollup";
import type { ResolvedConfig, UserConfig } from "config";
import type { CachedModule } from "cache/cache";
import { Logger } from "utils/logger";
import { getBuiltinPlugins } from "./builtins";
import { createPluginContainer } from "./pluginContainer";

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

export type Hook = "config" | "configResolved" | "resolveId" | "load" | "shouldTransformCachedModule" | "transform";
export type Format = "commonjs" | "module";

// Plugins

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
  shouldTransformCachedModule?: PluginHook<ShouldTransformCachedModuleHook>;
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
  shouldTransformCachedModule?: ShouldTransformCachedModuleHook;
  transform?: TransformHook;
};

// Plugin container

export interface PluginContainer {
  ctx: PluginContext;

  // Config
  config(config: UserConfig, env: { mode: string; command: string }): UserConfig | null | void;
  configResolved(config: ResolvedConfig): void;
  // File hooks
  resolveId(id: string, importer: string | undefined, _skip?: Array<SortedPlugin>): Promise<rollup.ResolveIdResult>;
  load(id: string): Promise<rollup.LoadResult>;
  shouldTransformCachedModule(options: { code: string; id: string }): Promise<boolean>;
  transform(code: string, id: string): Promise<rollup.TransformResult>;
}

export interface PluginContext {
  // Accessed by the `this` property in a plugin hook
  // https://rollupjs.org/plugin-development/#plugin-context

  //debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...msg: string[]): void;

  // Metadata from rollup (and potentially from nite?)
  meta: {
    rollupVersion: string;
    watchMode: boolean;
  };

  cache: {
    get(id: string): Promise<Required<CachedModule> | null>;
    set(id: string, src: string): Promise<Required<CachedModule>>;
  };

  // Methods
  resolve(
    id: string,
    importer?: string,
    options?: { skipSelf?: boolean; isEntry?: boolean }
  ): PromiseOpt<string | null | void | false | { id: string; format?: Format }>; //rollup.ResolvedId;
  /* load(options: { id: string }): Promise<rollup.ModuleInfo>; */
}

// Hook methods

export type ConfigHook = (this: PluginContext, config: UserConfig, env: { mode: string; command: string }) => UserConfig | null | void;
export type ConfigResolvedHook = (this: PluginContext, config: UserConfig) => void;

export type ResolveIdHook = (
  this: PluginContext,
  source: string,
  importer: string | undefined,
  options: { isEntry: boolean }
) => PromiseOpt<string | null | void | false | { id: string; format?: Format }>;
export type LoadHook = (this: PluginContext, id: string) => PromiseOpt<string | null | void | { code: string; format?: Format }>;
export type ShouldTransformCachedModuleHook = (options: { code: string; id: string }) => Promise<boolean | null | void>;
export type TransformHook = (this: PluginContext, source: string, id: string) => PromiseOpt<string | null | void | { code: string; format?: Format }>;

// Helpers

export type SortedPlugins = SortedPlugin[];

type PluginHook<T> = T | { handler: T; enforce?: "pre" | "post" };
type PromiseOpt<T> = T | Promise<T>;