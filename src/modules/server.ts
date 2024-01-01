import type { ResolvedConfig, InlineConfig } from "config";
import type { FSWatcher, WatchOptions } from "chokidar";
import type { PluginContainer } from "./index";
import type { ModuleGraph } from "./moduleGraph";
import { createPluginContainer } from "./pluginContainer";

export interface NiteDevServer {
  /**
   * The resolved config from the config file
   */
  config: ResolvedConfig;
  /**
   * Chokidar watcher instance
   * https://github.com/paulmillr/chokidar#api
   */
  watcher: FSWatcher;
  /**
   * The plugin container invoked by nite
   */
  pluginContainer: PluginContainer;
  /**
   * The modulegraph instance that tracks resolveId, load and transform hooks on the modules
   */
  moduleGraph: ModuleGraph;
}

export interface ServerOptions {
  /**
   * Chokidar watch options, or null to disable file watching
   */
  watch?: WatchOptions | null;
}

export type ResolvedServerOptions = Readonly<{
  watch: WatchOptions | null;
}>;

export async function createServer(inlineConfig: InlineConfig): Promise<NiteDevServer> {
  //const pluginContainer = createPluginContainer();
  return;
}

export function resolveServerOptions(config: InlineConfig): ResolvedServerOptions {
  let resolved: ResolvedServerOptions;

  resolved = {
    watch: resolveWatchOptions(config)
  };

  return resolved;
}

function resolveWatchOptions(config: InlineConfig): WatchOptions {
  if (config.server && config.server.watch) {
    const watchOptions = config.server.watch;
    if (watchOptions === null) return null;
    else if (typeof watchOptions == "object") return watchOptions;
  }
  // Defaults
  return {};
}
