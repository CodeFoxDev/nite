import type { ResolvedConfig, InlineConfig } from "config";
import type { FSWatcher } from "chokidar";
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

async function createServer(inlineConfig: InlineConfig): Promise<NiteDevServer> {
  //const pluginContainer = createPluginContainer();
  return;
}
