import type { ObjectHook } from "rollup";
import type { Plugin, HookHandler, PluginWithRequiredHook, SortedPlugin } from "modules";

import PluginAlias from "./alias";
import PluginOptimizedDeps from "./optimizeDeps";
import PluginJSON from "./json";
import PluginESBuild from "./esbuild";
import PluginEntryTime from "./entryTime";
import PluginENV from "./env";
import PluginDefault from "./default";
import { ResolvedConfig } from "config";

export async function resolvePlugins(
  config: ResolvedConfig,
  prePlugins: Plugin[],
  normalPlugins: Plugin[],
  postPlugins: Plugin[]
): Promise<Plugin[]> {
  const isBuild = config.command == "build";

  return [
    PluginAlias(config),
    PluginOptimizedDeps(config),
    ...prePlugins,
    PluginJSON(config),
    PluginESBuild(config),
    ...normalPlugins,
    ...postPlugins,
    PluginENV(config),
    /* PluginEntryTime(), */
    PluginDefault()
  ];
}

export async function resolvePluginsFromConfig(config: ResolvedConfig) {}

export function sortUserPlugins(plugins: Plugin[] | undefined): [Plugin[], Plugin[], Plugin[]] {
  const prePlugins: Plugin[] = [];
  const normalPlugins: Plugin[] = [];
  const postPlugins: Plugin[] = [];

  if (plugins) {
    for (const p of plugins.flat()) {
      if (p.enforce == "pre") prePlugins.push(p);
      else if (p.enforce == "post") postPlugins.push(p);
      else normalPlugins.push(p);
    }
  }

  return [prePlugins, normalPlugins, postPlugins];
}

/**
 * @param plugins Needs to follow `method.order` from rollup instead of `method.enforce`
 */
export function getSortedPluginsByHook<K extends keyof Plugin>(hookName: K, plugins: readonly Plugin[]) {
  const pre: Plugin[] = [];
  const normal: Plugin[] = [];
  const post: Plugin[] = [];

  for (const plugin of plugins) {
    const hook = plugin[hookName];
    if (!hook) continue;
    if (typeof hook == "object") {
      if (hook.order == "pre") pre.push(stripPlugin(plugin));
      else if (hook.order == "post") post.push(stripPlugin(plugin));
      continue;
    }
    normal.push(stripPlugin(plugin));
  }
  return [...pre, ...normal, ...post] as PluginWithRequiredHook<K>[];
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
