import type { ModuleNode, ResolveIdResult, LoadResult, TransformResult } from "./moduleGraph";
import * as path from "node:path";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import { ensureDirRelative, normalizeId } from "utils/id";
import { Logger } from "utils/logger";

const logger = new Logger(["modules", "cache"]);
const modulesJson = path.resolve(process.cwd(), "node_modules/.nite/modules.json");
export let cachedModules: ModuleCacheInfo[] = [];

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

  _cacheData?: ModuleCacheInfo;

  constructor(cache: ModuleCacheInfo, transformResult?: TransformResult) {
    this.file = cache.file;
    this.cacheFile = cache.cacheFile;
    this.hash = cache.hash;
    if (transformResult === undefined || transformResult === null) {
      if (!fs.existsSync(this.cacheFile)) return;
      const c = fs.readFileSync(this.cacheFile).toString();
      this.transformResult = parseContent(c);
    }
    this.transformResult = transformResult;
  }

  async cache() {
    if (!this.transformResult) return;
    if (this._cacheData) {
    }
    this._cacheData = { file: this.file, cacheFile: this.cacheFile, hash: this.hash };
    // Update modules file
    updateModulesJson(this._cacheData);
  }
}

export function getCacheFile(): string {
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
  if (fs.existsSync(modulesJson) || cachedModules.length > 0) {
    const content = fs.readFileSync(modulesJson);
    cachedModules = JSON.parse(content.toString()) as ModuleCacheInfo[];
  } else ensureDirRelative("node_modules/.nite");
  cachedModules.push(data);
  fs.writeFileSync(modulesJson, JSON.stringify(cachedModules, null, "\t"));
}

function createContent(data: ModuleCache): string {
  return `
// @cache_file {"${data.file}"}
// @cache_plugin {"${data.transformResult.plugin}"}
// @cache_original_time {"${data.transformResult.time}"}
${data.transformResult.code}`;
}

const FILTER_RE = /\/\/ @(cache_[a-z_]*) {"(.*?)"}/g;

function parseContent(code: string): TransformResult {
  let m = {};
  for (let i = 0; i < 3; i++) {
    const f = FILTER_RE.exec(code);
    if (!f) continue;
    m[f[1]] = f[2];
  }
  return {
    plugin: m["cache_plugin"],
    time: m["cache_original_time"],
    code: code
  };
}
