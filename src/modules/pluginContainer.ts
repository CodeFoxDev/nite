// https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js

// TODO: modify plugin to only include the useable methods
import type { Plugin, SortedPlugin, PluginContext, PluginContainer, Hook } from ".";
import type { ModuleFormat } from "node:module";
import { existsSync, readFile } from "node:fs";
import { ModuleGraph, ModuleNode } from "./moduleGraph";
import { PartialLogger } from "utils/logger";
import { normalizeId } from "utils/id";
import { getSortedPluginsByHook, getHookHandler } from "../plugins";
import { resolvePath as mllY_resolvePath, resolveImports as mlly_resolveImports, normalizeid } from "mlly";
import * as cache from "cache";

const logger = new PartialLogger(["plugins", "hooks"]);
logger.condition(() => false);

export function createPluginContainer(plugins: Plugin[], opts = {}) {
  if (!Array.isArray(plugins)) plugins = [plugins];

  let plugin: SortedPlugin | null = null;
  const _pluginLogger = new PartialLogger(["plugins"]);
  const moduleGraph = new ModuleGraph();

  // The value of the `this` property in a plugin hook
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

    config(config, env) {
      let _sorted = getSortedPluginsByHook("config", plugins);
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
      let _sorted = getSortedPluginsByHook("configResolved", plugins);
      for (plugin of _sorted) plugin.configResolved.call(ctx, config);
    },
    async resolveId(id, importer, _skip) {
      if (!id) return null;
      let resolved: string | null;
      // The name that gets added to the modulegraph
      let _plugin: string;
      let _sorted = getSortedPluginsByHook("resolveId", plugins);
      // Execute resolveId hooks on plugins
      for (const p of _sorted) {
        if (!p.resolveId) continue;
        if (_skip) {
          if (_skip.includes(p)) continue;
        }
        plugin = p;

        let res = await plugin.resolveId.call(ctx, id, importer);
        if (!res) continue;
        resolved = typeof res == "object" ? res.id : res;
        _plugin = plugin.name;
        break;
      }

      if (!resolved) return null;
      const mod = moduleGraph.ensureEntryFromFile(normalizeId(resolved));
      mod.resolveIdResult = { plugin: _plugin };
      if (importer) {
        const importerMod = moduleGraph.ensureEntryFromFile(normalizeId(importer));
        mod.importers.add(importerMod);
        importerMod.imported.add(mod);
      }

      return resolved;
    },
    async load(id) {
      if (!id) return;
      let code: string;
      // The name that gets added to the modulegraph
      let _plugin: string;
      let _sorted = getSortedPluginsByHook("load", plugins);
      // Execute load hooks on plugins
      for (plugin of _sorted) {
        if (!plugin.load) continue;
        const res = await plugin.load.call(ctx, id);
        if (!res) continue;
        code = res;
        _plugin = plugin.name;
        break;
      }

      if (!code) return null;
      const mod = moduleGraph.getModulesByFile(id);
      mod.loadResult = { plugin: _plugin, code };

      return { code };
    },
    async transform(code, id) {
      const mod = moduleGraph.getModulesByFile(id);
      let _sorted = getSortedPluginsByHook("transform", plugins);

      for (plugin of _sorted) {
        if (!plugin.transform) continue;
        const res = await plugin.transform.call(ctx, code, id);
        if (!res) continue;
        code = typeof res == "object" ? res.code : res;
        mod.transformResult.add({ code, plugin: plugin.name });
        // implement source maps?
      }
      return { code };
    }
    /* async shouldTransformCachedModule(options) {
      let _sorted = getSortedPluginsByHook("shouldTransformCachedModule", plugins);
      for (plugin of _sorted) {
        if (!plugin.shouldTransformCachedModule) continue;
        const res: boolean | null = await plugin.shouldTransformCachedModule.call(ctx, options);
        if (res == null) continue;
        logger.infoName("shouldTransformCachedModule", { id: options.id, plugin: plugin.name });
        return res;
      }
      return false;
    } */
  };

  return container;
}
