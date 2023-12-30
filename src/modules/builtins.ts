import PluginESBuild from "../plugins/esbuild";
import PluginJSON from "../plugins/json";
import PluginOptimizedDeps from "../plugins/optimizedDeps";
import PluginEntryTime from "../plugins/entryTime";
import type { Plugin } from "./plugin";
// TODO: Move this to config initialization
export function getBuiltinPlugins(): Plugin[] {
  return [PluginOptimizedDeps(), PluginJSON(), PluginESBuild(), PluginEntryTime()];
}
