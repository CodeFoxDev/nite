import type { ObjectHook } from "rollup";
import type { Plugin, HookHandler, PluginWithRequiredHook, SortedPlugin } from "modules";

import PluginOptimizedDeps from "./optimizedDeps";
import PluginJSON from "./json";
import PluginESBuild from "./esbuild";
import PluginEntryTime from "./entryTime";
import PluginDefault from "./default";

export const builtins = [PluginOptimizedDeps(), PluginJSON(), PluginESBuild(), PluginEntryTime(), PluginDefault()];

/**
 * @param plugins Needs to follow `method.order` from rollup instead of `method.enforce`
 */
export function getSortedPluginsByHook<K extends keyof Plugin>(hookName: K, plugins: readonly Plugin[]) {
  let sorted = [[], [], [], [], [], []];

  for (const plugin of plugins) {
    const builtin = plugin.name.startsWith("nite:") ? 1 : 0;
    const hookMethod = plugin[hookName];
    if (!hookMethod) continue;
    let order = 2;
    if (typeof hookMethod == "object") order = hookMethod.order == "pre" ? 0 : hookMethod.order == "post" ? 4 : 2;
    sorted[order + builtin].push(stripPlugin(plugin));
  }
  return sorted.flat() as PluginWithRequiredHook<K>[];
}

function stripPlugin(plugin: Plugin): SortedPlugin {
  let res: SortedPlugin = { name: plugin.name };
  for (const prop in plugin) {
    const val = plugin[prop];
    if (typeof val == "object" && typeof val.handler == "function") res[prop] = val;
    else res[prop] = val;
  }

  return res;
}

export function getHookHandler<T extends ObjectHook<Function>>(hook: T): HookHandler<T> {
  return (typeof hook == "function" ? hook : hook.handler) as HookHandler<T>;
}
