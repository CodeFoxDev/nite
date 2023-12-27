import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { config } from "config";
import { PartialLogger } from "utils/logger";

const logger = new PartialLogger(["cache"]);
let cacheDir: string = null;
let entries: EntryInfo[] = [];

export async function isCached(id: string) {
  if (!id.includes("node_modules")) return false; // Currently only caching node_modules
  if (!cacheDir) cacheDir = await getCacheDir();
  if (entries.length == 0) getEntries();
  const i = getModuleInfo(id);
  const found = entries.find((e) => e.name == i.name && e.version == i.version && e.file == i.file);
  return !!found;
}

export async function getCached(id: string) {
  if (!cacheDir) cacheDir = await getCacheDir();
  const info = getModuleInfo(id);
  if (!info) return logger.error(`Tried to get module with id: ${id}, but was not found`);
  const i = getEntryInfo(info);
  const path = join(cwd(), cacheDir, "temp", getFileId(i));

  try {
    return readFileSync(path, { encoding: "utf-8" });
  } catch {
    return logger.error(`Tried to get module with id: ${i.id}, but was not found`);
  }
}

export async function addCached(id: string, src: string) {
  if (!id.includes("node_modules")) return false; // Currently only caching node_modules
  if (!cacheDir) cacheDir = await getCacheDir();
  const i = getModuleInfo(id);
  const entry: EntryInfo = {
    id: Math.random().toString(36).slice(2),
    name: i.name,
    version: i.version,
    file: i.file
  };
  entries.push(entry);
  writeFileSync(join(cwd(), cacheDir, "modules.json"), JSON.stringify(entries, null, 4));
  writeFileSync(join(cwd(), cacheDir, "temp", getFileId(entry)), src);
  return true;
}

async function getCacheDir() {
  const conf = await config();
  const cacheDir = conf ? conf.cacheDir : "node_modules/.nite";
  return cacheDir;
}

function getEntries() {
  const src = getModulesJson();
  entries = src ? src : [];
  return entries;
}

function getEntryInfo(i: CachedModuleInfo): EntryInfo | null {
  const found = entries.find((e) => e.name == i.name && e.version == i.version && e.file == i.file);
  if (!found) return null;
  return found;
}

function getFileId(i: EntryInfo): string {
  const s = i.file.split(".");
  const ext = s[s.length - 1];
  return `${i.id}.${ext}`;
}

function getModulesJson(): EntryInfo[] {
  try {
    const src = readFileSync(join(cwd(), cacheDir, "modules.json"), { encoding: "utf-8" });
    return JSON.parse(src);
  } catch {
    const path = join(cwd(), cacheDir);
    if (!existsSync(path)) mkdirSync(path);
    if (!existsSync(join(path, "temp"))) mkdirSync(join(path, "temp"));
    if (!existsSync(join(path, "modules.json"))) writeFileSync(join(path, "modules.json"), "[]");
    return [];
  }
}

const VERSION_REGEX = /\/([^\/]*?)@([0-9.]*?)\//;
const PATH_REGEX = /\/node_modules(.*)/;

function getModuleInfo(id: string): CachedModuleInfo | null {
  if (!id) return null;
  const match = id.match(VERSION_REGEX);
  if (!match) return null;
  const [_c, name, version] = match;
  const file = id.match(PATH_REGEX)[0];
  if (!name || !version || !file) return null;
  // Check if this module is installed
  return { name, version, file };
}

// /node_modules/.pnpm/ws@8.15.1/node_modules/ws/wrapper.mjs
const info: CachedModuleInfo = {
  id: "vm83z70dcvc",
  name: "ws",
  version: "8.15.1",
  file: "/node_modules/.pnpm/ws@8.15.1/node_modules/ws/wrapper.mjs"
  //hash: { sha256: "e37bddaf6d40a3b2ee107906f792cc5117e543cba776fa25f7aeeb3908637f7c" }
};

// TODO: Also add format, extension, etc.?
interface CachedModuleInfo {
  /**
   * The short file id of the module, is null if it hasn't been cached
   */
  id?: string;
  name: string;
  version: string;
  file: string;
  hash?: {
    sha256: string;
  };
}

interface EntryInfo extends CachedModuleInfo {
  id: string;
}
