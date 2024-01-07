import type { ModuleNode, ResolveIdResult, LoadResult, TransformResult } from "./moduleGraph";
import * as path from "node:path";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import { ensureDirRelative, normalizeId } from "utils/id";

const modulesJson = path.resolve(process.cwd(), "node_modules/.nite/modules.json");
let modulesContent: ModuleCacheInfo[] = [];

export interface ModuleCacheInfo {
  file: string;
  cacheFile: string;
  hash: string;
}

export class ModuleCache {
  /**
   * The resolved id for the original file
   */
  file: string;
  /**
   * The file location where this module's cache is stored
   */
  cacheFile: string;
  /**
   * The hash of the loadResult, used to compare two version with each other
   */
  hash: string;
  /**
   * The final transform result
   */
  transformResult: TransformResult;

  constructor(node: ModuleNode) {
    this.file = node.file;
    this.cacheFile = getCacheFile();
    this.hash = calculateHash(node);
    this.transformResult = node.transformResult[node.transformResult.length - 1];
  }
}

function getCacheFile(): string {
  const dir = ensureDirRelative("node_modules/.nite/modules");
  const id = Math.random().toString(36).slice(2);
  return normalizeId(path.resolve(dir, `${id}.js`));
}

export function calculateHash(node: ModuleNode) {
  const hash = createHash("sha256");
  hash.update(node.loadResult.code);
  return hash.digest("hex");
}

export function cacheModule(node: ModuleNode, cache: ModuleCache) {
  if (!cache.transformResult) return;
  const data: ModuleCacheInfo = {
    file: cache.file,
    cacheFile: cache.cacheFile,
    hash: cache.hash
  };
  // Update modules file
  updateModulesJson(data);

  // Write cached
  fsp.writeFile(data.cacheFile, createContent(cache));
}

function updateModulesJson(data: ModuleCacheInfo) {
  if (fs.existsSync(modulesJson) || modulesContent.length > 0) {
    const content = fs.readFileSync(modulesJson);
    modulesContent = JSON.parse(content.toString()) as ModuleCacheInfo[];
  } else ensureDirRelative("node_modules/.nite");
  modulesContent.push(data);
  fs.writeFileSync(modulesJson, JSON.stringify(modulesContent, null, "\t"));
}

function createContent(data: ModuleCache): string {
  return `
// @cache_file {"${data.file}"}
// @cache_plugin {"${data.transformResult.plugin}"}
${data.transformResult.code}`;
}
