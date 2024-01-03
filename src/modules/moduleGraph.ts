import type { ModuleFormat } from "node:module";

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
  transformResult = new Set<TransformStackNode>();

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
      this.file = id;
      this.nodeModule = true;
      //console.log(id);
    } else {
      this.file = id;
    }
  }
}

type ResolveIdResult = { plugin: string };
type LoadResult = { code: string; plugin: string };
type TransformStackNode = { code: string; plugin: string };
type TransformResult = Set<TransformStackNode>;

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
}
