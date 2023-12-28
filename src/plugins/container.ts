// https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js

// TODO: modify plugin to only include the useable methods
import type { Plugin, SortedPlugin, PluginContext, PluginContainer, Hook } from "./plugin";
import { existsSync, readFile } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { PartialLogger } from "utils/logger";
import { resolvePath as mllY_resolvePath, resolveImports as mlly_resolveImports, normalizeid } from "mlly";
import * as cache from "cache";

const logger = new PartialLogger(["plugins", "hooks"]);
logger.condition(() => false);

export function createPluginContainer(plugins: Plugin[], opts = {}) {
  if (!Array.isArray(plugins)) plugins = [plugins];

  let plugin: SortedPlugin | null = null;
  const _pluginLogger = new PartialLogger(["plugins"]);

  // The value of the `this` property in a plugin hook
  // TODO: Make ctx immutable when passed in the hooks? or just create copy?
  const ctx: PluginContext = {
    meta: {
      rollupVersion: "4.9.1", // TODO: read this from package.json?
      watchMode: false
    },

    cache: {
      async get(id) {
        return cache.get(id);
      },
      async set(id, src) {
        return cache.set(id, src);
      }
    },

    resolve(id, importer, options) {
      return container.resolveId(id, importer);
    },

    // TODO: Add env check for logging
    info: (...args) => _pluginLogger.infoName(plugin?.name, ...args),
    warn: (...args) => _pluginLogger.warnName(plugin?.name, ...args),
    error: (...args) => _pluginLogger.errorName(plugin?.name, ...args)
  };

  const container: PluginContainer = {
    ctx,

    // Hooks
    config(config, env) {
      let _sorted = sortPluginsHook(plugins, "config");
      for (plugin of _sorted) {
        let res = plugin.config.call(ctx, config, env);
        if (!res) continue;
        for (const key in res) {
          if (typeof config[key] == "undefined") config[key] = res[key];
          else _pluginLogger.warnName(plugin.name, `Tried merging the key: ${key}, but it has already been defined, skipping value...`);
        }
      }
      return config;
    },
    configResolved(config) {
      let _sorted = sortPluginsHook(plugins, "configResolved");
      for (plugin of _sorted) plugin.configResolved.call(ctx, config);
    },
    async resolveId(id, importer, _skip) {
      if (!id) return null;
      let resolved: string | null;
      let _sorted = sortPluginsHook(plugins, "resolveId");
      // Execute resolveId hooks on plugins
      for (const p of _sorted) {
        if (!p.resolveId) continue;
        if (_skip) {
          if (_skip.includes(p)) continue;
        }
        plugin = p;

        let res = await p.resolveId.call(ctx, id, importer);
        if (!res) continue;
        logger.infoName("resolvedId", { id, plugin: plugin.name });
        if (typeof res == "string") resolved = res;
        else resolved = res.id;
        return { id: resolved };
      }
      // Execute default resolve
      let abs: string = null;
      try {
        abs = await mllY_resolvePath(id, { url: importer });
      } catch {
        return null;
      }
      let normalized = normalizeid(abs);
      if (normalized.startsWith("file://")) normalized = normalized.replace("file://", "");
      // TODO: Add support for import aliases
      if (abs.startsWith("node:")) return { id: abs };
      else if (existsSync(normalized)) return { id: normalized };
      else return null;
    },
    async load(id) {
      let _sorted = sortPluginsHook(plugins, "load");
      // Execute load hooks on plugins
      for (plugin of _sorted) {
        if (!plugin.load) continue;
        const res = await plugin.load.call(ctx, id);
        if (!res) continue;
        logger.infoName("load", { id, plugin: plugin.name });
        return res;
      }
      // Execute default load
      return new Promise((resolve) => {
        readFile(id, (err, data) => {
          if (!err) return resolve(data.toString());
          // TODO: Implement proper error handling
          // also don't error if it's a module (e.g. node:fs, rollup, etc.)
          //logger.errorName("load", "Failed to load file using default hook");
          resolve(null);
        });
      });
    },
    async transform(code, id) {
      // Check if cached
      let _sorted = sortPluginsHook(plugins, "transform");
      for (plugin of _sorted) {
        if (!plugin.transform) continue;
        const res = await plugin.transform.call(ctx, code, id);
        if (!res) continue;
        logger.infoName("transform", { id, plugin: plugin.name });
        if (typeof res == "object") code = res.code;
        else code = res;
        //addCached(id, res);
        // implement source maps?
      }
      return { code };
    },
    async shouldTransformCachedModule(options) {
      let _sorted = sortPluginsHook(plugins, "shouldTransformCachedModule");
      for (plugin of _sorted) {
        if (!plugin.shouldTransformCachedModule) continue;
        const res: boolean | null = await plugin.shouldTransformCachedModule.call(ctx, options);
        if (res == null) continue;
        logger.infoName("shouldTransformCachedModule", { id: options.id, plugin: plugin.name });
        return res;
      }
      return false;
    }
  };

  return container;
}

export const hooks = ["config", "configResolved", "resolveId", "load", "transform", "shouldTransformCachedModule"];

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

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}
