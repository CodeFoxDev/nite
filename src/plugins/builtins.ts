import PluginESBuild from "./builtin/esbuild";
import PluginJSON from "./builtin/json";
import PluginOptimizedDeps from "./builtin/optimizedDeps";
import PluginEntryTime from "./builtin/entryTime";
import type { Plugin } from "./plugin";

export function getBuiltinPlugins(): Plugin[] {
  return [PluginOptimizedDeps(), PluginJSON(), PluginESBuild(), PluginEntryTime()];
}
