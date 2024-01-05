## TODO

- dev
  - Custom esm module loader
  - Rollup like plugin integrations
    - hooks
      > Rollup hooks
      - [ ] options
      - [ ] buildStart
      - [x] resolveId
      - [x] load
        - Default load: add support for queries in id
      - [x] transform
      - [ ] moduleParsed (not during dev)
      - [ ] shouldTransformCachedModule
      - [ ] watchChange
      - [ ] buildEnd
      - [ ] closeBundle
      > Custom hooks
      - [x] config
      - [x] configResolved
    - Context
      > Rollup context
      - [x] this.resolve
      - [ ] this.load
      - [ ] this.parse
      - [ ] this.getFileName
      - [ ] this.getModuleInfo
      - [ ] this.addWatchFile
      - [ ] this.getWatchFiles
      - [x] this.info
      - [x] this.warn
      - [x] this.error
      - [ ] this.debug
      > Custom context
      - [ ] this.cache
        - [ ] this.cache.get
        - [ ] this.cache.set
      > Fixes
      - [ ] Remove context from config* hooks, and update context on other hooks
    - [x] ordering
    - loading
      - Allow rollup-only plugins to load with `apply="buid"` and `enfore="post"`
        ```js
        plugins: [
          nitePluginExample(),
          {
            ...rollupPluginExample(),
            apply: "build",
            enfore: "post"
          }
        ]
        ```
        or
        ```js
        rollup: { // rollup config entry
          plugins: [
            rollupPluginExample()
          ]
        }
        ```
  - Config
    - [x] Load config file and add proper types and options
    - [ ] Parse config file (if it is: ts, etc.)
    - [x] Load / Parse package.json for determining package type (module, commonjs, etc.)
    - [ ] Load / Parse tsconfig.json for esbuild
- build
- DX
  - Proper error handling
    - Nodejs operations with errorcodes
    - Change nodejs errors to have proper file lines, instead of the build one (only in build mode)
    - Nite errors with proper error messages
      - Code 'chunks' where the error occured (similar to esbuild and wmr)
        Generate code chunks from e.g. this:
        ```
        file:///C:/Users/Robin/Documents/Programming/Home/homecontrols/api/test.ts:2
        export function test(log: string): boolean {
                                ^

        SyntaxError: Unexpected token ':'
            at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:152:18)
            at ModuleLoader.moduleProvider (node:internal/modules/esm/loader:298:14)

        Node.js v18.19.0
        ```
  - Dev 'server' with reloading on file change, or shortcut in terminal
  - Devtools with load/transform stack overview (like vite-plugin-inspect) (in seperate plugin?)
  - Statically analyze imported (ts) code to check for (type) errors, on seperate thread?
- optimzeDeps
  - [x] Bundle the library into single file (like vite)
    - Error: Cannot find module @rollup/rollup-win32-x64-msvc. npm has a bug related to optional dependencies (with prebundled version of vite)
  - [x] Optimize code
    - Converted to esm
  - [ ] Add config option to exclude/include libraries (optimizeDeps from vite)
    - optimizeDeps.include is not yet used
- Env
  - [ ] Load .env files same way that vite does it
    - I think it's the same but haven't tested it thoroughly yet
  - [x] Add env to import.meta.env (also add vite's custom env variables)
- Imports
  - [ ] Import aliases
  - [ ] Import queries
    - `*?node` completely skip plugins on import


- https://nodejs.org/api/module.html#customization-hooks
- https://rollupjs.org/plugin-development
- https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js
- https://vitejs.dev/guide/api-plugin.html#plugin-ordering
- https://esbuild.github.io/api/#js-sync