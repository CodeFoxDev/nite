export class FileUrl {
  id: string;
  extension: string;
  ext: string;

  constructor(id: string) {
    this.id = id;

    this.extension = this.#getExtension();
    this.ext = this.extension;
  }
  #getExtension() {
    const s = this.id.split(".");
    return s[s.length - 1];
  }
}

interface ParsedId {
  /**
   * The parsed id
   */
  id: string;
  /**
   * The extension of the parsed id,
   *
   * Id is split by the dot and the last section is the extension
   */
  extension: string;
  /**
   * Shorthand for ParsedId.extension
   */
  ext: string;
  /**
   * The loader to use for esbuild
   */
  loader?: "js" | "ts" | "jsx" | "tsx";
  /**
   * Format will be determined by the extension, it it doesn't end with: `cjs`, `mjs`, `cts` or `mts` it will be null
   */
  format?: "module" | "commonjs" | null;
  /**
   * If the parsed id is in the node_modules folder, then it will be marked as external
   */
  external: boolean;
}

export function parseId(id: string): ParsedId {
  if (!id) return null;
  const s = id.split(".");
  // TODO: Also remove queries `time.css?inline`
  const ext = s[s.length - 1];
  let loader = null;

  let format = null;
  if (ext == "mjs" || ext == "mts") format = "module";
  else if (ext == "cjs" || ext == "cts") format = "commonjs";

  if (ext == "js" || ext == "ts" || ext == "jsx" || ext == "tsx") loader = ext;
  else if (ext == "json") loader = "js";

  const external = id.includes("node_modules");

  return {
    id,
    ext,
    extension: ext,
    format,
    loader,
    external
  };
}

export function normalizePath(path: string): string {
  if (path.includes("\\")) path = path.replaceAll("\\", "/");
  return path;
}