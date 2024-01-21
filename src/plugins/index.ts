import type { ObjectHook } from "rollup";
import type { Plugin, HookHandler, PluginWithRequiredHook, SortedPlugin } from "modules";
import type { ClientConfig, ResolvedConfig, InlineConfig, ConfigEnv } from "config";
import { loadConfigFromFile } from "config";
import { asyncFlatten, mergeConfig } from "utils";

import PluginAlias from "./alias";
import PluginOptimizedDeps from "./optimizeDeps";
import PluginJSON from "./json";
import PluginESBuild from "./esbuild";
import PluginEntryTime from "./entryTime";
import PluginENV from "./env";
import PluginDefault from "./default";

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

export async function resolvePluginsToConfig(config: ClientConfig): Promise<ResolvedConfig> {
  const l = await loadConfigFromFile(config.configFile);
  const { plugins } = l.config;

  const configEnv: ConfigEnv = { mode: config.mode, command: config.command };

  const rawUserPlugins = ((await asyncFlatten(plugins || [])) as Plugin[]).filter((p: Plugin) => {
    if (!p) return false;
    else if (!p.apply) return true;
    else if (typeof p.apply == "function") return p.apply({ ...config, mode: config.mode });
    else return p.apply === config.command;
  });

  const [prePlugins, normalPlugins, postPlugins] = sortUserPlugins(rawUserPlugins);
  const userPlugins = [...prePlugins, ...normalPlugins, ...postPlugins];
  config = await runConfigHook(config, userPlugins, configEnv);

  let resolved: ResolvedConfig = {
    ...config,
    plugins: []
  };

  const resolvedPlugins = await resolvePlugins(resolved, prePlugins, normalPlugins, postPlugins);
  (resolved.plugins as Plugin[]) = resolvedPlugins;
  runConfigResolvedHook(resolved, resolvedPlugins);

  return {
    ...config,
    plugins: resolvedPlugins
  };
}

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

async function runConfigHook(config: ClientConfig, plugins: Plugin[], configEnv: ConfigEnv) {
  let conf = config;

  for (const p of getSortedPluginsByHook("config", plugins)) {
    const hook = p.config;
    const handler = getHookHandler(hook);
    if (!handler) continue;
    const res = await handler(conf, configEnv);
    if (res) conf = mergeConfig(conf, res);
  }

  return conf;
}

function runConfigResolvedHook(config: ResolvedConfig, plugins: Plugin[]) {
  for (const p of getSortedPluginsByHook("configResolved", plugins)) {
    const handler = getHookHandler(p.configResolved);
    if (handler) handler(config);
  }
}
