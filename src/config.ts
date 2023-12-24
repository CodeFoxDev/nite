import type { BuildOptions as ESBuildOptions } from "esbuild";

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export interface UserConfig {
  root?: string;
  esbuild?: ESBuildOptions;
  plugins?: Array<object>;
  resolver?: {};
}

export type ResolvedConfig = Readonly<UserConfig>;
