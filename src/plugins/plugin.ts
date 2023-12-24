import type { UserConfig } from "config";

export type Hook = "config" | "configResolved" | "resolveId" | "load" | "transform";

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

export type ConfigHook = (config: UserConfig, env: { mode: string; command: string }) => UserConfig | null | void;
export type ConfigResolvedHook = (config: UserConfig) => void;

export type ResolveIdHook = (source: string, importer: string | undefined, options: { isEntry: boolean }) => string | null | false | { id: string };
export type LoadHook = (id: string) => string | null | { code: string };
export type TransformHook = (source: string, id: string) => string | null | { code: string };

export type SortedPlugins = SortedPlugin[];

type PluginHook<T = typeof Function> = T | { handler: T; enforce?: "pre" | "post" };
