import type { ResolvedConfig, InlineConfig, ClientConfig } from "config";
import type { FSWatcher, WatchOptions } from "chokidar";
import type { PluginContainer } from "../modules";
import * as path from "node:path";
import * as fs from "node:fs";
import { register } from "register";
import { MessageBus } from "bus";
import { resolveConfig } from "config";
import { createPluginContainer, ModuleGraph } from "modules";
import { normalizeNodeHook } from "utils";
import * as chokidar from "chokidar";

export interface NiteDevServer {
  /**
   * The resolved config from the config file
   */
  config: ClientConfig;
  /**
   * Chokidar watcher instance
   * https://github.com/paulmillr/chokidar#api
   */
  //watcher: FSWatcher | null;
  /**
   * The plugin container invoked by nite
   * this will go through the custom `MessageBus` because the actual pluginContainer is on sepearte thread
   */
  //pluginContainer: PluginContainer;
  /**
   * The modulegraph instance that tracks resolveId, load and transform hooks on the modules
   * this will go through the custom `MessageBus` because the actual moduleGraph is on sepearte thread
   */
  //moduleGraph: ModuleGraph;

  start(): Promise<void>;
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
  const resolvedEntry = resolveEntry(config);

  //const watcher: FSWatcher | null =
  //  config.server.watch !== null ? chokidar.watch(config.root, config.server.watch) : null;

  let messageBus = new MessageBus();

  let server: NiteDevServer = {
    config,
    //watcher,

    async start() {
      // TODO: Wrap with try {} to catch and parse all errors
      await import(normalizeNodeHook(resolvedEntry));
    },

    async register() {
      if (messageBus.port) return;
      const { port, time } = await register(config, import.meta.url);
      await messageBus.bind(port);
    },

    async restart(forceOptimize = false) {},

    async close() {}
  };

  inlineConfig.autoStart ??= true;
  if (inlineConfig.autoStart === true) {
    server.register();
    await server.start();
  }

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

function resolveEntry(config: ClientConfig) {
  const packagePath = path.resolve(config.projectRoot, "package.json");
  const _default = path.resolve(config.projectRoot, "index.js");
  if (fs.existsSync(normalizeNodeHook(packagePath))) return _default;
  try {
    const c = fs.readFileSync(packagePath);
    const parsed = JSON.parse(c.toString());
    if (!parsed.main) return _default;
    return path.resolve(config.projectRoot, parsed.main);
  } catch {
    return _default;
  }
}
