import type { Plugin, Hook, SortedPlugin } from "./plugin";
import { hooks } from "./plugin";

export function sortPlugins(plugins: Plugin[]): Plugin[] {
  let sorted = [[], [], [], [], [], []];

  for (const plugin of plugins) {
    const enfore = plugin.enforce == "pre" ? 0 : plugin.enforce == "post" ? 4 : 2;
    const builtin = plugin.name.startsWith("nite:") ? 1 : 0;
    const index = enfore + builtin;
    sorted[index].push(plugin);
  }
  return sorted.flat(2);
}

export function sortPluginsHook(plugins: Plugin[], hook: Hook): SortedPlugin[] {
  let sorted: SortedPlugin[][] = [[], [], [], [], [], []];

  for (const plugin of plugins) {
    const builtin = plugin.name.startsWith("nite:") ? 1 : 0;
    let enforce = 2;
    const hookMethod = plugin[hook];
    if (typeof hookMethod == "object") enforce = hookMethod.enforce == "pre" ? 0 : hookMethod.enforce == "post" ? 4 : 2;
    sorted[enforce + builtin].push(stripPlugin(plugin));
  }
  return sorted.flat(2);
}

function stripPlugin(plugin: Plugin): SortedPlugin {
  let res: SortedPlugin = { name: plugin.name };
  for (const prop in plugin) if (!hooks.includes(prop)) res[prop] = plugin[prop];

  for (const hook of hooks) {
    if (!plugin[hook]) continue;
    const hookMethod = plugin[hook];
    if (typeof hookMethod == "function") res[hook] = hookMethod;
    else res[hook] = hookMethod.handler;
  }

  return res;
}
