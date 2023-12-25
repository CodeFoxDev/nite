## TODO

- dev
  - Custom esm module loader
  - Rollup like plugin integrations
    - hooks
      - config
      - configResolved
      - resolveId
      - load
      - transform
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
    - ordering
      - user 'pre'
      - nite 'pre'
      - user
      - nite
      - user 'post'
      - nite 'post'
  - Config
- build
  
- https://nodejs.org/api/module.html#customization-hooks
- https://rollupjs.org/plugin-development
- https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js#L315
- https://vitejs.dev/guide/api-plugin.html#plugin-ordering
- https://esbuild.github.io/api/#js-sync