import PluginESBuild from "./builtin/esbuild";
import PluginJSON from "./builtin/json";
import type { Plugin } from "./plugin";

export function getBuiltinPlugins(): Plugin[] {
  return [PluginJSON(), PluginESBuild()];
}
