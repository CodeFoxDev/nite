// TODO: Also add format, extension, etc.?
export interface CachedModule {
  /**
   * The short file id of the module, is null if it hasn't been cached
   */
  id?: string | null;
  /**
   * The cached code of the module, is null if it hasn't been cached
   */
  code?: string | null;
  /**
   * The name of the parent node_module
   */
  name: string;
  /**
   * The version of the parent node_module
   */
  version: string;
  /**
   * The original file id, which has been cached
   */
  file: string;
}

export interface EntryInfo extends CachedModule {
  id: string;
}
