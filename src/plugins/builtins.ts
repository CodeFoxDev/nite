import PluginESBuild from "./builtin/esbuild";
import { Plugin } from "./plugin";

export function getBuiltinPlugins(): Plugin[] {
  return [PluginESBuild()];
}
