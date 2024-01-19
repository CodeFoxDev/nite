import type { ResolvedConfig, InlineConfig } from "config";
import type { FSWatcher, WatchOptions } from "chokidar";
import type { PluginContainer } from "../modules";
import { register } from "register";
import { MessageBus } from "bus";
import { resolveConfig } from "config";
import { createPluginContainer, ModuleGraph } from "modules";
import * as chokidar from "chokidar";

export interface NiteDevServer {
  /**
   * The resolved config from the config file
   */
  config: ResolvedConfig;
  /**
   * Chokidar watcher instance
   * https://github.com/paulmillr/chokidar#api
   */
  //watcher: FSWatcher | null;
  /**
   * The plugin container invoked by nite
   * this will go through the custom `MessageBus` because the actual pluginContainer is on sepearte thread
   */
  pluginContainer: PluginContainer;
  /**
   * The modulegraph instance that tracks resolveId, load and transform hooks on the modules
   * this will go through the custom `MessageBus` because the actual moduleGraph is on sepearte thread
   */
  moduleGraph: ModuleGraph;

  /**
   * Registers the es module loader
   */
  register(): Promise<void>;
  /**
   * Restart the server
   *
   * @param forceOptimize Force the optimizer to re-bundle
   */
  restart(forceOptimize?: boolean): Promise<void>;
  /**
   * Stops the server
   */
  close(): Promise<void>;
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
  const config = await resolveConfig(inlineConfig, "serve");

  //const watcher: FSWatcher | null =
  //  config.server.watch !== null ? chokidar.watch(config.root, config.server.watch) : null;

  const moduleGraph = new ModuleGraph();
  const container = createPluginContainer(config, moduleGraph);

  let messageBus = new MessageBus();

  let server: NiteDevServer = {
    config,
    //watcher,
    moduleGraph,
    pluginContainer: container,

    async register() {
      if (messageBus.port) return;
      const { port, time } = await register(config, import.meta.url);
      messageBus.bind(port);
    },

    async restart(forceOptimize = false) {},

    async close() {}
  };

  inlineConfig.autoRegister ??= true;
  if (inlineConfig.autoRegister === true) await server.register();

  return server;
}

// TODO: Move this to config, because of circular dependency
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
