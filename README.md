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