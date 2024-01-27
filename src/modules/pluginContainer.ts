// https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js

// TODO: modify plugin to only include the useable methods
import type { SortedPlugin, PluginContext, PluginContainer } from ".";
import type { ModuleGraph } from "./moduleGraph";
import type { ResolvedConfig } from "config";
import type { FSWatcher } from "chokidar";
import { performance } from "node:perf_hooks";
import { PartialLogger } from "utils/logger";
import { isProjectFile, normalizeId } from "utils/id";
import { getSortedPluginsByHook } from "../plugins";

const logger = new PartialLogger(["plugins", "hooks"]);

export function createPluginContainer(config: ResolvedConfig, moduleGraph: ModuleGraph) {
  const { plugins } = config;

  let plugin: SortedPlugin | null = null;
  const _pluginLogger = new PartialLogger(["plugins"]);

  // The value of the `this` property in a plugin hook
  // TODO: switch to class to allow parallel hooks
  const ctx: PluginContext = {
    meta: {
      rollupVersion: "4.9.1", // TODO: read this from package.json?
      watchMode: false
    },

    moduleGraph,

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
          else
            _pluginLogger.warnName(
              plugin.name,
              `Tried merging the key: ${key}, but it has already been defined, skipping value...`
            );
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
      const specifier = id;
      let resolved: string | null;
      const s = performance.now();
      // The name that gets added to the modulegraph
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
        break;
      }
      if (!resolved) return null;
      const mod = moduleGraph.ensureEntryFromFile(normalizeId(resolved));
      mod.resolveIdResult = {
        plugin: plugin.name,
        time: performance.now() - s,
        specifier,
        importer
      };
      if (importer) {
        const importerMod = moduleGraph.ensureEntryFromFile(normalizeId(importer));
        mod.importers.add(importerMod);
        importerMod.imported.add(mod);
      } // Else it's the entry file

      return resolved;
    },
    async load(id) {
      if (!id) return null;
      let code: string;
      const s = performance.now();
      const mod = moduleGraph.getModulesByFile(id);
      // The name that gets added to the modulegraph
      let _sorted = getSortedPluginsByHook("load", plugins);
      // Execute load hooks on plugins
      for (plugin of _sorted) {
        if (!plugin.load) continue;
        const res = await plugin.load.call(ctx, id);
        if (!res) continue;
        code = res;
        break;
      }

      if (!code) return null;
      if (mod)
        mod.loadResult = {
          plugin: plugin.name,
          code,
          time: performance.now() - s
        };
      else
        logger.warn(
          `Module: ${id}, doesn't exist in the moduleGraph, but the load hook tried to modify its loadResult property`
        );

      return { code };
    },
    async transform(code, id) {
      const mod = moduleGraph.getModulesByFile(id);
      /* const cache = mod.getCachedModule();
      if (cache !== null && typeof cache == "object") {
        const loaded = await cache.loadCache();
        if (typeof loaded == "string") return { code: loaded };
      } */
      let _sorted = getSortedPluginsByHook("transform", plugins);

      for (plugin of _sorted) {
        if (!plugin.transform) continue;
        const s = performance.now();
        const res = await plugin.transform.call(ctx, code, id);
        if (!res) continue;
        code = typeof res == "object" ? res.code : res;
        if (mod)
          mod.transformResult.push({
            code,
            plugin: plugin.name,
            time: performance.now() - s
          });
        else
          logger.warn(
            `Module: ${id}, doesn't exist in the moduleGraph, but the transform hook tried to modify its transformResult property`
          );
      }
      if (isProjectFile(id)) mod.cacheModule();
      return { code };
    },
    async shouldTransformCachedModule(options) {
      let _sorted = getSortedPluginsByHook("shouldTransformCachedModule", plugins);
      for (plugin of _sorted) {
        if (!plugin.shouldTransformCachedModule) continue;
        const res: boolean | null = await plugin.shouldTransformCachedModule.call(ctx, options);
        if (res == null) continue;
        // TODO: Add to module graph
        return res;
      }
      return false;
    }
  };

  return container;
}
