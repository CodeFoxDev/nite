import type * as rollup from "rollup";
import type { ObjectHook } from "rollup";
import type { ResolvedConfig, InlineConfig } from "config";
import type { ModuleGraph } from "./moduleGraph";
import { Logger } from "utils/logger";

const logger = new Logger(["plugins", "container"]);

export type Hook = "config" | "configResolved" | "resolveId" | "load" | "shouldTransformCachedModule" | "transform";
export type Format = "commonjs" | "module";

// Export
export { createPluginContainer } from "./pluginContainer";
export { ModuleGraph, ModuleNode } from "./moduleGraph";

// Plugins

export interface Plugin /*  extends rollup.Plugin */ {
  name: string;
  version?: string;
  enforce?: "pre" | "post";
  apply?: "dev" | "build" | ((v: any) => boolean); // Also allow function? (like vite)
  debug?: boolean;

  /**
   * Hook to modify the config, return an object to merge config,
   * or change the config parameter directly to mutate.
   */
  config?: ObjectHook<ConfigHook>;
  /**
   * The final resolved config
   */
  configResolved?: ObjectHook<ConfigResolvedHook>;
  /** */
  resolveId?: ObjectHook<ResolveIdHook>;
  load?: ObjectHook<LoadHook>;
  transform?: ObjectHook<TransformHook>;
}

export type SortedPlugin = Plugin & {
  config?: ConfigHook;
  configResolved?: ConfigResolvedHook;
  resolveId?: ResolveIdHook;
  load?: LoadHook;
  transform?: TransformHook;
};

// Plugin container

export interface PluginContainer {
  ctx: PluginContext;

  // Config
  config(config: InlineConfig, env: { mode: string; command: string }): InlineConfig | null | void;
  configResolved(config: ResolvedConfig): void;
  // File hooks
  resolveId(id: string, importer: string | undefined, _skip?: Array<SortedPlugin>): Promise<rollup.ResolveIdResult>;
  load(id: string): Promise<rollup.LoadResult>;
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

  moduleGraph: ModuleGraph;

  /*   cache: {
    get(id: string): Promise<Required<CachedModule> | null>;
    set(id: string, src: string): Promise<Required<CachedModule>>;
  }; */

  // Methods
  resolve(
    id: string,
    importer?: string,
    options?: { skipSelf?: boolean; isEntry?: boolean }
  ): PromiseOpt<string | null | void | false | { id: string; format?: Format }>; //rollup.ResolvedId;
  /* load(options: { id: string }): Promise<rollup.ModuleInfo>; */
}

// Hook methods

export type ConfigHook = (
  this: void,
  config: InlineConfig,
  env: { mode: string; command: string }
) => InlineConfig | null | void;
export type ConfigResolvedHook = (this: void, config: ResolvedConfig) => void;

export type ResolveIdHook = (
  this: PluginContext,
  source: string,
  importer: string | undefined,
  options: { isEntry: boolean }
) => PromiseOpt<string | null | void | false | { id: string; format?: Format }>;
export type LoadHook = (
  this: PluginContext,
  id: string
) => PromiseOpt<string | null | void | { code: string; format?: Format }>;
export type ShouldTransformCachedModuleHook = (options: { code: string; id: string }) => Promise<boolean | null | void>;
export type TransformHook = (
  this: PluginContext,
  source: string,
  id: string
) => PromiseOpt<string | null | void | { code: string; format?: Format }>;

// Helpers

export type SortedPlugins = SortedPlugin[];
export type HookHandler<T> = T extends ObjectHook<infer H> ? H : T;
export type PluginWithRequiredHook<K extends keyof SortedPlugin> = SortedPlugin & {
  [P in K]: NonNullable<Plugin[P]>;
};
type PromiseOpt<T> = T | Promise<T>;
