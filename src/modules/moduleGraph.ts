import type { ModuleFormat } from "node:module";
import { cacheModule, ModuleCache } from "./moduleCache";

export class ModuleNode {
  /**
   * - The name of an external module located in the node_modules folder (e.g. `rollup`)
   * - The name of a builtin nodejs module (e.g. `node:fs`) the same as `file`
   * - The resolved id of a virtual module, also the same as `file`
   */
  id?: string | null;
  /**
   * - The resolved absolute location of this module
   * - The name of a builtin nodejs module (e.g. `node:fs`)
   * - The resolved id of a virtual module prefixed with `\0`
   */
  file: string;
  /**
   * The resolved format of the module,
   * - `builtin` if the id starts with `node:*` (a builtin module)
   */
  format: ModuleFormat;

  // Meta data
  virtual = false;
  nodeModule = false;
  version?: string | null;

  /**
   * The ModuleCache instance
   */
  cache?: ModuleCache;

  /**
   * All the modules that import this node
   */
  importers = new Set<ModuleNode>();
  /**
   * All the modules that this node imports
   */
  imported = new Set<ModuleNode>();

  // Plugin hook results
  resolveIdResult: ResolveIdResult;
  loadResult: LoadResult;
  transformResult: TransformResult[] = [];
  // Total node hooks performance
  nodeResolveTime: number;
  nodeLoadTime: number;

  /**
   * @param id Normalized using the builtin normalizeId function
   */
  constructor(id: string) {
    if (!id) return;
    // check if it is absolute
    if (id.startsWith("node:")) {
      this.id = this.file = id;
      this.format = "builtin";
    } else if (id.startsWith("\0") || id.startsWith("virtual:")) {
      this.id = this.file = id;
      this.virtual = true;
    } else if (id.includes("node_modules")) {
      const info = getNodeModuleInfo(id);
      if (!info) return; // Should never happen, but check yarn and npm compatibility anyway
      this.id = info.name;
      this.version = info.version;
      this.file = id;
      this.nodeModule = true;
    } else {
      this.file = id;
    }
  }
}

type DefaultResult = {
  plugin: string;
  code: string;
  time: number;
};

export type ResolveIdResult = Omit<DefaultResult, "code">;
export type LoadResult = DefaultResult;
export type TransformResult = DefaultResult;

export class ModuleGraph {
  idToModuleMap = new Map<string, ModuleNode>();
  fileToModuleMap = new Map<string, ModuleNode>();

  getModulesById(id: string): ModuleNode | undefined {
    // TODO: Add support for queries
    return this.idToModuleMap.get(id);
  }

  getModulesByFile(file: string): ModuleNode | undefined {
    return this.fileToModuleMap.get(file);
  }

  ensureEntryFromFile(file: string): ModuleNode {
    let mod = this.getModulesByFile(file);
    if (mod) return mod;
    mod = new ModuleNode(file);
    this.fileToModuleMap.set(file, mod);
    return mod;
  }

  /**
   * Caches the provided module for future use
   */
  cacheModule(node: ModuleNode) {
    node.cache = new ModuleCache(node);
    cacheModule(node, node.cache);
  }

  getCachedModule(node: ModuleNode) {}
}

const NAME_VERSION_RE = /\/([a-zA-Z-_+@]+?)@([0-9.]+)[^ \/]*?\//;

function getNodeModuleInfo(file: string) {
  if (!file.includes("node_modules")) return null;
  const m = NAME_VERSION_RE.exec(file);
  if (!m) return null;
  return {
    full: m[0],
    name: m[1],
    version: m[2]
  };
}
