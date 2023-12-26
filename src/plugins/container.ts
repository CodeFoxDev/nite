// https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js

// TODO: modify plugin to only include the useable methods
import { readFile } from "node:fs";
import type { Plugin, SortedPlugin, PluginContext, PluginContainer } from "./plugin";
import { PartialLogger } from "utils/logger";
import { sortPluginsHook } from "./sort";

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
    // TODO: Add env check for logging
    info: (...args) => _pluginLogger.infoName(plugin?.name, ...args),
    warn: (...args) => _pluginLogger.warnName(plugin?.name, ...args),
    error(err) {
      if (typeof err == "string") err = { message: err };
      _pluginLogger.errorName(plugin?.name, err);
    },
    debug(...args) {
      // TODO: Add env check for logging
    }

    /* resolve(id, importer, options = { skipSelf: false }) {},
    async load(options) {
      return {
        code: ""
      };
    } */
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
      let resolved: string | null;
      let _sorted = sortPluginsHook(plugins, "resolveId");
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
        // Return on first non-null result
        break;
      }
      return resolved ? { id: resolved } : null;
    },
    async transform(code, id) {
      let _sorted = sortPluginsHook(plugins, "transform");
      for (plugin of _sorted) {
        if (!plugin.transform) continue;
        const res = await plugin.transform.call(ctx, code, id);
        if (!res) continue;
        logger.infoName("transform", { id, plugin: plugin.name });
        if (typeof res == "object") code = res.code;
        else code = res;
        // implement source maps?
      }
      return { code };
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
    }
  };

  return container;
}
