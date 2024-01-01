import type { BuildOptions as ESBuildOptions, TransformOptions as ESBuildTransformOptions } from "esbuild";
import type { RollupOptions } from "rollup";
import type { Plugin } from "./modules";
import type { ServerOptions, ResolvedServerOptions } from "./modules/server";
import type { WatchOptions } from "chokidar";
import * as fs from "node:fs";
import * as path from "node:path";
import { cwd } from "node:process";
import { resolveServerOptions } from "./modules/server";
import { Logger } from "utils/logger";
import { mergeConfig, asyncFlatten, booleanValue } from "utils/config";
import { normalizeNodeHook, normalizePath } from "utils/id";
import { getHookHandler, getSortedPluginsByHook, resolvePlugins, sortUserPlugins } from "./plugins";

// Valid names for the config file
const defaultConfigFiles = ["nite.config.js", "nite.config.mjs"];
const logger = new Logger(["config"]);

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export interface ConfigEnv {
  command: "build" | "serve";
  mode: string;
}

type PluginOption = Plugin | false | PluginOption[] | Promise<Plugin | false | PluginOption[]>;

interface JsonOptions {
  /**
   * Generate a named export for every property of the JSON object
   * @default true
   */
  namedExports?: boolean;
  /**
   * Generate performant output as JSON.parse("stringified").
   * Enabling this will disable namedExports.
   * @default false
   */
  stringify?: boolean;
}

interface BuildOptions {
  target: ESBuildTransformOptions["target"] | "false";
  outDir?: string;
  minify?: boolean | "esbuild";
  rollupOptions?: RollupOptions;
  emptyOutDir?: boolean | null;
}

interface UserConfig {
  /**
   * The root of the project, can be an absolute path or relative from the config file
   * @default process.cwd()
   */
  root?: string;
  /**
   * The directory in which nite stores cached version of modules
   * @default 'node_modules/.nite'
   */
  cacheDir?: string;
  /**
   * The directory in which will be searched for .env & .env.* files, can be absolute or relative to the root property
   * @default root
   */
  envDir?: string;
  /**
   * Explicitly sets the mode of the application, overrides the default mode for each command
   */
  mode?: "development" | "build";
  /**
   * Array of plugins to use
   */
  plugins?: PluginOption[];

  /* resolve?: {
    alias
  } */
  /**
   * Options that are used for json importing, will be passed to the `nite:json` plugin
   */
  json?: JsonOptions;
  /**
   * Options for esbuild, will be passed to the `nite:esbuild` plugin
   */
  esbuild?: ESBuildOptions;

  server?: ServerOptions;

  build?: BuildOptions;
}

export interface InlineConfig extends UserConfig {
  /**
   * The url for the configFile relative to the project root,
   * leave empty (or null) for default locations, and set to false to disable config file
   */
  configFile?: string | false;
}

export type ResolvedJsonOptions = Readonly<{
  namedExports: boolean;
  stringify: boolean;
}>;

export type ResolvedBuildOptions = Readonly<{
  target: ESBuildTransformOptions["target"] | "false";
  outDir: string;
  minify: boolean | "esbuild";
  rollupOptions: RollupOptions;
  emptyOutDir: boolean | null;
}>;

export type ResolvedConfig = Readonly<
  Omit<UserConfig, "plugins" | "optimizeDeps" | "build"> & {
    configFile: string | null;
    inlineConfig: InlineConfig;
    root: string;
    cacheDir: string;
    envDir: string;
    command: "build" | "serve";
    mode: "development" | "build";
    plugins: readonly Plugin[];
    json: ResolvedJsonOptions;
    esbuild: ESBuildOptions;
    server: ResolvedServerOptions;
    build: ResolvedBuildOptions;
    //logger?; Vite adds logger here, but also add it to the server interface?
  }
>;

export async function resolveConfig(inlineConfig: InlineConfig, command: "build" | "serve"): Promise<ResolvedConfig> {
  let config: InlineConfig = inlineConfig;
  let mode = config.mode ?? "development";
  if (!!process.env.NODE_ENV) process.env.NODE_ENV = mode;

  const configEnv: ConfigEnv = { mode, command };

  if (config.configFile !== false) {
    const loadResult = await loadConfigFromFile(config.configFile);
    if (loadResult) {
      config = mergeConfig(config, loadResult.config);
    }
  }

  mode = inlineConfig.mode || config.mode || mode;
  configEnv.mode = mode;

  const rawUserPlugins = ((await asyncFlatten(config.plugins || [])) as Plugin[]).filter((p: Plugin) => {
    if (!p) return false;
    else if (!p.apply) return true;
    else if (typeof p.apply == "function") return p.apply({ ...config, mode });
    else return p.apply === command;
  });

  const [prePlugins, normalPlugins, postPlugins] = sortUserPlugins(rawUserPlugins);
  const userPlugins = [...prePlugins, ...normalPlugins, ...postPlugins];
  config = await runConfigHook(config, userPlugins, configEnv);

  const resolvedRoot = normalizePath(config.root ? path.resolve(config.root) : process.cwd());

  // TODO: Check if these directories exist
  const envDir = config.envDir ? normalizePath(path.resolve(resolvedRoot, config.envDir)) : resolvedRoot;
  const cacheDir = normalizePath(path.resolve(resolvedRoot, config.envDir ? config.envDir : "node_modules/.nite"));

  let resolved: ResolvedConfig;

  resolved = {
    configFile: config.configFile ? normalizePath(config.configFile) : undefined,
    inlineConfig,
    root: resolvedRoot,
    cacheDir,
    envDir,
    command,
    mode,
    plugins: [],
    json: {
      namedExports: config.json?.stringify ? false : config.json?.namedExports ?? true,
      stringify: booleanValue(config.json?.stringify, false)
    },
    esbuild: config.esbuild ?? {},
    server: resolveServerOptions(config),
    // TODO: Add user provided options
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: "dist",
      target: "esnext",
      rollupOptions: {}
    }
  };

  const resolvedPlugins = await resolvePlugins(resolved, prePlugins, normalPlugins, postPlugins);
  (resolved.plugins as Plugin[]) = resolvedPlugins;

  runConfigResolvedHook(resolved, resolvedPlugins);

  return resolved;
}

async function loadConfigFromFile(file?: string, root: string = process.cwd()) {
  let resolved: string = null;

  if (file) {
    resolved = path.resolve(root, file);
    if (!fs.existsSync(resolved)) {
      logger.error("The config file specified doesn't exist");
      return null;
    }
  } else {
    for (const configFile of defaultConfigFiles) {
      const filePath = path.resolve(root, configFile);
      if (!fs.existsSync(filePath)) continue;
      resolved = filePath;
      break;
    }
  }

  if (!resolved) {
    logger.error("No config file found");
    return null;
  }

  // TODO: Add support for ts in config file (by building this file)
  let config: UserConfig;
  try {
    const configExport = (await import(normalizeNodeHook(resolved))).default;
    config = await (typeof configExport == "function" ? configExport() : configExport);

    return {
      config
    };
  } catch (e) {
    logger.error(`Failed to load config from ${normalizeNodeHook(resolved)}`, e);
  }
}

async function runConfigHook(config: InlineConfig, plugins: Plugin[], configEnv: ConfigEnv) {
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
