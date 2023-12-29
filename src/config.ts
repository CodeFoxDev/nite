import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { Logger } from "utils/logger";

import type { BuildOptions as ESBuildOptions } from "esbuild";
import type { RollupOptions } from "rollup";
import type { Plugin } from "./plugins/plugin";
import type { WatchOptions } from "chokidar";
import { load } from "loader/hooks";

// Valid names for the config file
const ids = ["nite.config.js", "nite.config.mjs"];
const logger = new Logger(["config"]);

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

let loaded: ResolvedConfig | null = null;

export async function config(): Promise<ResolvedConfig | false> {
  if (loaded != null) return loaded;
  let id: string;
  for (const _id of ids) {
    if (!existsSync(resolve(cwd(), _id))) continue;
    id = resolve(cwd(), _id);
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
  mode?: "dev" | "build";
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

export type ResolvedConfig = Readonly<UserConfig>;
