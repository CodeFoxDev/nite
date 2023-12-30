import type { BuildOptions as ESBuildOptions } from "esbuild";
import type { RollupOptions } from "rollup";
import type { Plugin } from "./modules";
import type { WatchOptions } from "chokidar";
import * as fs from "node:fs";
import * as path from "node:path";
import { cwd } from "node:process";
import { Logger } from "utils/logger";
import { builtins } from "./plugins";

// Valid names for the config file
const defaultConfigFiles = ["nite.config.js", "nite.config.mjs"];
const logger = new Logger(["config"]);

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

let loaded: ResolvedConfig | null = null;

export async function config(): Promise<ResolvedConfig | false> {
  if (loaded != null) return loaded;
  let id: string;
  for (const _id of defaultConfigFiles) {
    if (!fs.existsSync(path.resolve(cwd(), _id))) continue;
    id = path.resolve(cwd(), _id);
    break;
  }

  let config: UserConfig;
  try {
    config = (await import(`file://${id}`)).default;
  } catch (err) {
    return logger.error(`Failed to load config from: ${id}, err:`, err);
  }

  if (!config) return logger.error("Received empty config, while trying to resolve it");
  loaded = config = loadDefaults(config);
  //logger.info(config);
  // load defaults
  return config;
}

function loadDefaults(config: UserConfig): ResolvedConfig {
  config.cacheDir ??= "node_modules/.nite";
  config.root ??= ".";

  return config;
}

export interface UserConfig {
  /**
   * The root of the project
   * @default '.'
   */
  root?: string;
  /**
   * The directory in which nite stores cached version of modules
   * @default 'node_modules/.nite'
   */
  cacheDir?: string;
  build?: {
    outDir?: string;
    rollupOptions?: RollupOptions;
  };
  plugins?: Array<Plugin>;
  esbuild?: ESBuildOptions;

  watch?: WatchOptions;
}

export interface InlineConfig extends UserConfig {
  /**
   * The url for the configFile relative to the project root,
   * leave empty (or null) for default locations, and set to false to disable config file
   */
  configFile?: string | false;
  mode?: "development" | "build";
}

export interface ResolvedConfig extends InlineConfig {
  logger?; // Vite adds logger here, but also add it to the server interface?
}

export async function resolveConfig(inlineConfig: InlineConfig): Promise<ResolvedConfig> {
  let config: InlineConfig = inlineConfig;
  let mode = config.mode ?? "development";

  if (config.configFile !== false) {
    const loadResult = await loadConfigFromFile(config.configFile);
    if (loadResult) {
      config = mergeConfig(config, loadResult.config);
    }
  }
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
    const configExport = (await import(resolved)).default;
    config = await (typeof configExport == "function" ? configExport() : configExport);

    return {
      config
    };
  } catch {
    logger.error(`Failed to load config from ${resolved}`);
  }
}
// Merges the config, the first value has the highest priority
function mergeConfig(config, pluginConfig): InlineConfig {
  return;
}
