// https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js

// TODO: modify plugin to only include the useable methods
import type * as rollup from "rollup";
import type { UserConfig, ResolvedConfig } from "config";
import type { Plugin, SortedPlugin, SortedPlugins } from "./plugin";
import { PartialLogger, PluginLogger } from "utils/logger";
import { sortPlugins, sortPluginsHook } from "./sort";

const logger = new PartialLogger("hooks");

export function createPluginContainer(plugins: SortedPlugins, opts = {}) {
  if (!Array.isArray(plugins)) plugins = [plugins];

  let plugin: SortedPlugin | null = null;
  const _pluginLogger = new PluginLogger();

  // The value of the `this` property in a plugin hook
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
    },

    resolve(id, importer, options = { skipSelf: false }) {}
  };

  const container: PluginContainer = {
    ctx,

    config(config, env) {
      let res = null;
      let _sorted = sortPluginsHook(plugins, "config");
      for (plugin of _sorted) {
        res = plugin.config.call(ctx, config, env);
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
      for (const p of plugins) {
        if (!p.resolveId) continue;
        // check if should skip?
        plugin = p;
      }
      return;
    },

    async transform(code, id) {
      for (plugin of plugins) {
        if (!plugin.transform) continue;
        const res = plugin.transform.call(ctx, code, id);
        if (!res) continue;
        logger.infoName("transform", { id, plugin: plugin.name });
        if (typeof res == "object") code = res.code;
        else code = res;
        // implement source maps?
      }
      return { code };
    },
    async load(id) {
      for (plugin of plugins) {
        if (!plugin.load) continue;
        const res = plugin.load.call(ctx, id);
        if (!res) continue;
        logger.infoName("load", { id, plugin: plugin.name });
        return res;
      }
    }
  };

  return container;
}

// Accessed by the `this` property in a plugin hook
// https://rollupjs.org/plugin-development/#plugin-context
interface PluginContext {
  // Logging
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(msg: { message: string } | string): void;

  // Metadata from rollup (and potentially from nite?)
  meta: {
    rollupVersion: string;
    watchMode: boolean;
  };

  // Methods
  resolve(id: string, importer: string, options: { skipSelf?: boolean }): void; // Resolves the filename for the given id, calls the resolveId method on plugins
}

interface PluginContainer {
  ctx: PluginContext;

  // Config
  config(config: UserConfig, env: { mode: string; command: string }): UserConfig | null | void;
  configResolved(config: ResolvedConfig): void;
  // File hooks
  resolveId(id: string, importer: string | undefined, _skip: Array<string>): Promise<rollup.ResolveIdResult>;
  load(id: string): Promise<rollup.LoadResult>;
  transform(code: string, id: string): Promise<rollup.TransformResult>;
}
