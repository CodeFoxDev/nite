import PluginOptimizedDeps from "./optimizedDeps";
import PluginJSON from "./json";
import PluginESBuild from "./esbuild";
import PluginEntryTime from "./entryTime";
import PluginDefault from "./default";

export const builtins = [PluginOptimizedDeps(), PluginJSON(), PluginESBuild(), PluginEntryTime(), PluginDefault()];
