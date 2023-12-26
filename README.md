## TODO

- dev
  - Custom esm module loader
  - Rollup like plugin integrations
    - hooks
      - [x] config
      - [x] configResolved
      - [x] resolveId
      - [x] load
      - [x] transform
      - [ ] moduleParsed
      - [ ] shouldTransformCachedModule
      - [ ] watchChange
    - Context
      - [ ] this.resolve
      - [ ] this.load
      - [ ] this.getFileName
      - [ ] this.getModuleInfo
      - [ ] this.addWatchFile
      - [ ] this.getWatchFiles
      - [x] this.info
      - [x] this.warn
      - [x] this.error
      - [ ] this.debug
    - ordering
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
    - Parse config file (if it is: ts, etc.)
- build
  
- https://nodejs.org/api/module.html#customization-hooks
- https://rollupjs.org/plugin-development
- https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js#L315
- https://vitejs.dev/guide/api-plugin.html#plugin-ordering
- https://esbuild.github.io/api/#js-sync