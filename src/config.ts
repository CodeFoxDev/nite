import type { BuildOptions as ESBuildOptions, TransformOptions as ESBuildTransformOptions } from "esbuild";
import type { RollupOptions } from "rollup";
import type { Plugin } from "./modules";
import type { ServerOptions, ResolvedServerOptions } from "server";
import type { WatchOptions } from "chokidar";
import * as fs from "node:fs";
import * as path from "node:path";
import { cwd } from "node:process";
import { resolveServerOptions } from "server";
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

interface OptimizeDepsOptions {
  include?: string[];
  exclude?: string[];
  esbuildOptions?: ESBuildOptions;
  disabled?: boolean;
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
  optimizeDeps?: OptimizeDepsOptions;
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

  /**
   * Automatically register the es module loader
   * @default true
   */
  autoRegister?: boolean;
}

export type ResolvedJsonOptions = Readonly<{
  namedExports: boolean;
  stringify: boolean;
}>;

export type ResolvedOptimizeDepsOptions = Readonly<{
  include: string[];
  exclude: string[];
  esbuildOptions: ESBuildOptions;
  disabled: boolean;
}>;

export type ResolvedBuildOptions = Readonly<{
  target: ESBuildTransformOptions["target"] | "false";
  outDir: string;
  minify: boolean | "esbuild";
  rollupOptions: RollupOptions;
  emptyOutDir: boolean | null;
}>;

/**
 * The config available to the main thread, mostly similar to Entire config, except for plugins which are only loaded on the loader thread
 */
export type ClientConfig = Readonly<
  Omit<UserConfig, "plugins" | "optimizeDeps" | "build"> & {
    configFile: string | null;
    inlineConfig: InlineConfig;
    root: string;
    projectRoot: string;
    cacheDir: string;
    envDir: string;
    command: "build" | "serve";
    mode: "development" | "build";
    optimizeDeps: ResolvedOptimizeDepsOptions;
    json: ResolvedJsonOptions;
    esbuild: ESBuildOptions;
    server: ResolvedServerOptions;
    build: ResolvedBuildOptions;
    //logger?; Vite adds logger here, but also add it to the server interface?
  }
>;

export type ResolvedConfig = Readonly<
  ClientConfig & {
    plugins: readonly Plugin[];
  }
>;

export async function resolveConfig(inlineConfig: InlineConfig, command: "build" | "serve"): Promise<ClientConfig> {
  let config: InlineConfig = inlineConfig;
  let mode = config.mode ?? "development";
  if (!!process.env.NODE_ENV) process.env.NODE_ENV = mode;

  const configEnv: ConfigEnv = { mode, command };

  // TODO: Add support for other default paths (*.ts)
  const resolvedConfigFile = (() => {
    if (config.configFile === false) return undefined;
    else if (typeof config.configFile === "string") return config.configFile;
    else return path.resolve(process.cwd(), "nite.config.js");
  })();

  if (config.configFile !== false) {
    const loadResult = await loadConfigFromFile(config.configFile);
    if (loadResult) {
      config = mergeConfig(config, loadResult.config);
    }
  }

  mode = inlineConfig.mode || config.mode || mode;
  configEnv.mode = mode;

  const resolvedRoot = normalizePath(config.root ? path.resolve(config.root) : process.cwd());

  // TODO: Check if these directories exist
  const envDir = config.envDir ? normalizePath(path.resolve(resolvedRoot, config.envDir)) : resolvedRoot;
  const cacheDir = normalizePath(path.resolve(resolvedRoot, config.envDir ? config.envDir : "node_modules/.nite"));

  let resolved: ClientConfig;

  resolved = {
    configFile: normalizePath(resolvedConfigFile),
    inlineConfig,
    root: resolvedRoot,
    projectRoot: normalizePath(path.dirname(resolvedConfigFile)),
    cacheDir,
    envDir,
    command,
    mode,
    optimizeDeps: resolveOptimizeDepsOptions(config),
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

  return resolved;
}

function resolveOptimizeDepsOptions(config: InlineConfig): ResolvedOptimizeDepsOptions {
  const esbuildOptions = mergeConfig(
    {
      bundle: true,
      minify: false,
      platform: "node",
      format: "esm",
      target: "esnext",
      external: ["lightningcss"],
      plugins: [],
      banner: {
        js: `import { createRequire as __nite_createRequire } from 'node:module';
import { fileURLToPath as __nite_fileUrlToPath } from 'node:url';
const require = __nite_createRequire(import.meta.url);
const __filename = __nite_fileUrlToPath(import.meta.url);
const __dirname = __nite_fileUrlToPath(new URL('.', import.meta.url));`
      },
      outExtension: {
        ".js": ".mjs"
      }
    },
    config.optimizeDeps?.esbuildOptions
  ) as ESBuildOptions;

  return {
    include: config.optimizeDeps?.include ?? [],
    exclude: config.optimizeDeps?.exclude ?? ["vite"],
    esbuildOptions,
    disabled: config.optimizeDeps?.disabled ?? config.optimizeDeps === null ? true : false
  };
}

export async function loadConfigFromFile(file?: string, root: string = process.cwd()) {
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
    const configExport = (await import(`${normalizeNodeHook(resolved)}?node`)).default;
    config = await (typeof configExport == "function" ? configExport() : configExport);

    return {
      config
    };
  } catch (e) {
    logger.error(`Failed to load config from ${normalizeNodeHook(resolved)}`, e);
  }
}
