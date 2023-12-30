import type { ModuleFormat } from "node:module";
import type { LoadResult as _LoadResult, TransformResult as _TransformResult } from "rollup";

export class ModuleNode {
  /**
   * - `node:path` for nodejs builtin modules
   * - `rollup` for node modules located in the node_modules folder
   * - e.g. `/src/index.ts` for normal imports, these are relative to the project root (`process.cwd`)
   */
  id: string | null;
  /**
   * The normalized location of the file in the filesystem,
   * the id of a virtual module prefixed with `\0`,
   * or the if of a builtin nodejs module
   */
  file: string;
  /**
   * The resolved format of the module,
   * currently `json` isn't used because json is transpiled to js for named exports and tree-shaking
   * and `wasm` isn't supported at the moment
   */
  format: ModuleFormat;
  virtual = false;

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
   * @param fileOrId The absolute file url starting with the prefix `file:///` or nodejs builtin module starting with the prefix `node:`
   */
  constructor(fileOrId: string) {
    if (!fileOrId) return;
    // check if it is absolute
    if (fileOrId.startsWith("node:")) {
      this.id = this.file = fileOrId;
      this.format = "builtin";
    } else if (fileOrId.startsWith("\0") || fileOrId.startsWith("virtual:")) {
      this.id = this.file = fileOrId;
      this.virtual = true;
    } else this.file = fileOrId;
  }
}

type ResolveIdResult = { plugin: string };
type LoadResult = { code: string; plugin: string };
type TransformStackNode = { code: string; plugin: string };
type TransformResult = TransformStackNode[];

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

  ensureEntryFromId(id: string): ModuleNode {
    let mod = this.getModulesById(id);
    if (mod) return mod;
  }

  ensureEntryFromFile(file: string): ModuleNode {
    let mod = this.getModulesByFile(file);
    if (mod) return mod;
    mod = new ModuleNode(file);
    this.fileToModuleMap.set(file, mod);
    return mod;
  }
}
