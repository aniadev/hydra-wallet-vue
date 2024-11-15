// vitest.config.ts
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { mergeConfig, defineConfig as defineConfig2, configDefaults } from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/vitest@2.1.3_@types+node@20.16.13_jsdom@25.0.1_sass@1.80.3/node_modules/vitest/dist/config.js";

// vite.config.ts
import { fileURLToPath, URL as URL2 } from "node:url";
import { defineConfig } from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/vite@5.4.9_@types+node@20.16.13_sass@1.80.3/node_modules/vite/dist/node/index.js";
import vue from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/@vitejs+plugin-vue@5.1.4_vite@5.4.9_@types+node@20.16.13_sass@1.80.3__vue@3.5.12_typescript@5.5.4_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/@vitejs+plugin-vue-jsx@4.0.1_vite@5.4.9_@types+node@20.16.13_sass@1.80.3__vue@3.5.12_typescript@5.5.4_/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import vueDevTools from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-vue-devtools@7.5.2_rollup@4.24.0_vite@5.4.9_@types+node@20.16.13_sass@1.80.3__vue@3.5.12_typescript@5.5.4_/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import AutoImport from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unplugin-auto-import@0.18.3_@vueuse+core@11.1.0_vue@3.5.12_typescript@5.5.4___rollup@4.24.0/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unplugin-vue-components@0.27.4_@babel+parser@7.25.8_rollup@4.24.0_vue@3.5.12_typescript@5.5.4_/node_modules/unplugin-vue-components/dist/vite.js";
import Icons from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unplugin-icons@0.19.3_@vue+compiler-sfc@3.5.12/node_modules/unplugin-icons/dist/vite.js";
import IconsResolver from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unplugin-icons@0.19.3_@vue+compiler-sfc@3.5.12/node_modules/unplugin-icons/dist/resolver.js";
import { FileSystemIconLoader } from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unplugin-icons@0.19.3_@vue+compiler-sfc@3.5.12/node_modules/unplugin-icons/dist/loaders.js";
import { AntDesignVueResolver } from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unplugin-vue-components@0.27.4_@babel+parser@7.25.8_rollup@4.24.0_vue@3.5.12_typescript@5.5.4_/node_modules/unplugin-vue-components/dist/resolvers.js";
import UnoCSS from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/unocss@0.63.4_postcss@8.4.47_rollup@4.24.0_vite@5.4.9_@types+node@20.16.13_sass@1.80.3_/node_modules/unocss/dist/vite.mjs";
import wasm from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-wasm@3.3.0_vite@5.4.9_@types+node@20.16.13_sass@1.80.3_/node_modules/vite-plugin-wasm/exports/import.mjs";
import topLevelAwait from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-top-level-await@1.4.4_rollup@4.24.0_vite@5.4.9_@types+node@20.16.13_sass@1.80.3_/node_modules/vite-plugin-top-level-await/exports/import.mjs";
import { nodePolyfills } from "file:///E:/Code/VueJs/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-node-polyfills@0.22.0_rollup@4.24.0_vite@5.4.9_@types+node@20.16.13_sass@1.80.3_/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///E:/Code/VueJs/hydra-wallet-vue/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      // Specific modules that should not be polyfilled.
      exclude: [],
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        // can also be 'build', 'dev', or false
        global: true,
        process: true
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true
    }),
    UnoCSS(),
    Icons({
      compiler: "vue3",
      customCollections: {
        svg: FileSystemIconLoader("./src/assets/icons/svg")
      }
    }),
    AutoImport({
      resolvers: [AntDesignVueResolver()],
      imports: [
        "vue",
        "vue-router",
        "@vueuse/core",
        {
          "@iconify/vue": ["Icon"]
        }
      ],
      eslintrc: {
        enabled: true
      },
      dts: "src/auto-imports.d.ts",
      // plugins này sẽ tự động generated ra file auto-imports.d.ts trong source src.
      dirs: ["src/composables/**"],
      // chỗ này mình có thể thêm name folder nó sẽ tự động lấy tất cả các tên file trong folder đó và mình có thể gọi bất kì ở trong file Vue nào mà không cần import. (src/stores)
      vueTemplate: true
    }),
    Components({
      // allow auto load markdown components under `./src/components/`
      extensions: ["vue", "md"],
      // allow auto import and register components used in markdown
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        AntDesignVueResolver({
          importStyle: false
          // css in js
        }),
        IconsResolver({
          prefix: "i",
          customCollections: ["svg"],
          enabledCollections: ["@iconify-json/ic"]
        })
      ],
      exclude: [],
      version: 3,
      dts: "src/components.d.ts"
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL2("./src", __vite_injected_original_import_meta_url)),
      "@components": fileURLToPath(new URL2("./src/components", __vite_injected_original_import_meta_url)),
      "@modules": fileURLToPath(new URL2("./src/modules", __vite_injected_original_import_meta_url))
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue", ".scss"]
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        // or "modern", "legacy"
        importers: [
          // ...
        ]
      }
      // sass: {
      //   additionalData: `@import "@/styles/variables.sass"`
      // }
    }
  },
  define: {
    "process.env": {
      NODE_ENV: "",
      VITE_APP_BASE_API: "",
      VITE_APP_BASE_GRAPHQL_API: "",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false"
    }
  },
  server: {
    port: 3001
  }
});

// vitest.config.ts
var __vite_injected_original_import_meta_url2 = "file:///E:/Code/VueJs/hydra-wallet-vue/vitest.config.ts";
var vitest_config_default = mergeConfig(
  vite_config_default,
  defineConfig2({
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "e2e/**"],
      root: fileURLToPath2(new URL("./", __vite_injected_original_import_meta_url2))
    }
  })
);
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyIsICJ2aXRlLmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXENvZGVcXFxcVnVlSnNcXFxcaHlkcmEtd2FsbGV0LXZ1ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcQ29kZVxcXFxWdWVKc1xcXFxoeWRyYS13YWxsZXQtdnVlXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0NvZGUvVnVlSnMvaHlkcmEtd2FsbGV0LXZ1ZS92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xyXG5pbXBvcnQgeyBtZXJnZUNvbmZpZywgZGVmaW5lQ29uZmlnLCBjb25maWdEZWZhdWx0cyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnXHJcbmltcG9ydCB2aXRlQ29uZmlnIGZyb20gJy4vdml0ZS5jb25maWcnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBtZXJnZUNvbmZpZyhcclxuICB2aXRlQ29uZmlnLFxyXG4gIGRlZmluZUNvbmZpZyh7XHJcbiAgICB0ZXN0OiB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgICBleGNsdWRlOiBbLi4uY29uZmlnRGVmYXVsdHMuZXhjbHVkZSwgJ2UyZS8qKiddLFxyXG4gICAgICByb290OiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vJywgaW1wb3J0Lm1ldGEudXJsKSlcclxuICAgIH1cclxuICB9KVxyXG4pXHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQ29kZVxcXFxWdWVKc1xcXFxoeWRyYS13YWxsZXQtdnVlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxDb2RlXFxcXFZ1ZUpzXFxcXGh5ZHJhLXdhbGxldC12dWVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0NvZGUvVnVlSnMvaHlkcmEtd2FsbGV0LXZ1ZS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJ1xyXG5cclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCdcclxuaW1wb3J0IHZ1ZURldlRvb2xzIGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZS1kZXZ0b29scydcclxuXHJcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnXHJcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXHJcbmltcG9ydCBJY29ucyBmcm9tICd1bnBsdWdpbi1pY29ucy92aXRlJ1xyXG5cclxuaW1wb3J0IEljb25zUmVzb2x2ZXIgZnJvbSAndW5wbHVnaW4taWNvbnMvcmVzb2x2ZXInXHJcbmltcG9ydCB7IEZpbGVTeXN0ZW1JY29uTG9hZGVyIH0gZnJvbSAndW5wbHVnaW4taWNvbnMvbG9hZGVycydcclxuaW1wb3J0IHsgQW50RGVzaWduVnVlUmVzb2x2ZXIgfSBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy9yZXNvbHZlcnMnXHJcblxyXG5pbXBvcnQgVW5vQ1NTIGZyb20gJ3Vub2Nzcy92aXRlJ1xyXG5cclxuLy8gU0RLXHJcbmltcG9ydCB3YXNtIGZyb20gJ3ZpdGUtcGx1Z2luLXdhc20nXHJcbmltcG9ydCB0b3BMZXZlbEF3YWl0IGZyb20gJ3ZpdGUtcGx1Z2luLXRvcC1sZXZlbC1hd2FpdCdcclxuLy8gaW1wb3J0IHsgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbiB9IGZyb20gJ0Blc2J1aWxkLXBsdWdpbnMvbm9kZS1nbG9iYWxzLXBvbHlmaWxsJ1xyXG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnXHJcblxyXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICB2dWUoKSxcclxuICAgIHZ1ZUpzeCgpLFxyXG4gICAgdnVlRGV2VG9vbHMoKSxcclxuICAgIHdhc20oKSxcclxuICAgIHRvcExldmVsQXdhaXQoKSxcclxuICAgIG5vZGVQb2x5ZmlsbHMoe1xyXG4gICAgICAvLyBTcGVjaWZpYyBtb2R1bGVzIHRoYXQgc2hvdWxkIG5vdCBiZSBwb2x5ZmlsbGVkLlxyXG4gICAgICBleGNsdWRlOiBbXSxcclxuICAgICAgLy8gV2hldGhlciB0byBwb2x5ZmlsbCBzcGVjaWZpYyBnbG9iYWxzLlxyXG4gICAgICBnbG9iYWxzOiB7XHJcbiAgICAgICAgQnVmZmVyOiB0cnVlLCAvLyBjYW4gYWxzbyBiZSAnYnVpbGQnLCAnZGV2Jywgb3IgZmFsc2VcclxuICAgICAgICBnbG9iYWw6IHRydWUsXHJcbiAgICAgICAgcHJvY2VzczogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICAvLyBXaGV0aGVyIHRvIHBvbHlmaWxsIGBub2RlOmAgcHJvdG9jb2wgaW1wb3J0cy5cclxuICAgICAgcHJvdG9jb2xJbXBvcnRzOiB0cnVlXHJcbiAgICB9KSxcclxuICAgIFVub0NTUygpLFxyXG4gICAgSWNvbnMoe1xyXG4gICAgICBjb21waWxlcjogJ3Z1ZTMnLFxyXG4gICAgICBjdXN0b21Db2xsZWN0aW9uczoge1xyXG4gICAgICAgIHN2ZzogRmlsZVN5c3RlbUljb25Mb2FkZXIoJy4vc3JjL2Fzc2V0cy9pY29ucy9zdmcnKVxyXG4gICAgICB9XHJcbiAgICB9KSxcclxuICAgIEF1dG9JbXBvcnQoe1xyXG4gICAgICByZXNvbHZlcnM6IFtBbnREZXNpZ25WdWVSZXNvbHZlcigpXSxcclxuICAgICAgaW1wb3J0czogW1xyXG4gICAgICAgICd2dWUnLFxyXG4gICAgICAgICd2dWUtcm91dGVyJyxcclxuICAgICAgICAnQHZ1ZXVzZS9jb3JlJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAnQGljb25pZnkvdnVlJzogWydJY29uJ11cclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIGVzbGludHJjOiB7XHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICBkdHM6ICdzcmMvYXV0by1pbXBvcnRzLmQudHMnLCAvLyBwbHVnaW5zIG5cdTAwRTB5IHNcdTFFQkQgdFx1MUVGMSBcdTAxMTFcdTFFRDluZyBnZW5lcmF0ZWQgcmEgZmlsZSBhdXRvLWltcG9ydHMuZC50cyB0cm9uZyBzb3VyY2Ugc3JjLlxyXG4gICAgICBkaXJzOiBbJ3NyYy9jb21wb3NhYmxlcy8qKiddLCAvLyBjaFx1MUVENyBuXHUwMEUweSBtXHUwMEVDbmggY1x1MDBGMyB0aFx1MUVDMyB0aFx1MDBFQW0gbmFtZSBmb2xkZXIgblx1MDBGMyBzXHUxRUJEIHRcdTFFRjEgXHUwMTExXHUxRUQ5bmcgbFx1MUVBNXkgdFx1MUVBNXQgY1x1MUVBMyBjXHUwMEUxYyB0XHUwMEVBbiBmaWxlIHRyb25nIGZvbGRlciBcdTAxMTFcdTAwRjMgdlx1MDBFMCBtXHUwMEVDbmggY1x1MDBGMyB0aFx1MUVDMyBnXHUxRUNEaSBiXHUxRUE1dCBrXHUwMEVDIFx1MUVERiB0cm9uZyBmaWxlIFZ1ZSBuXHUwMEUwbyBtXHUwMEUwIGtoXHUwMEY0bmcgY1x1MUVBN24gaW1wb3J0LiAoc3JjL3N0b3JlcylcclxuICAgICAgdnVlVGVtcGxhdGU6IHRydWVcclxuICAgIH0pLFxyXG4gICAgQ29tcG9uZW50cyh7XHJcbiAgICAgIC8vIGFsbG93IGF1dG8gbG9hZCBtYXJrZG93biBjb21wb25lbnRzIHVuZGVyIGAuL3NyYy9jb21wb25lbnRzL2BcclxuICAgICAgZXh0ZW5zaW9uczogWyd2dWUnLCAnbWQnXSxcclxuICAgICAgLy8gYWxsb3cgYXV0byBpbXBvcnQgYW5kIHJlZ2lzdGVyIGNvbXBvbmVudHMgdXNlZCBpbiBtYXJrZG93blxyXG4gICAgICBpbmNsdWRlOiBbL1xcLnZ1ZSQvLCAvXFwudnVlXFw/dnVlLywgL1xcLm1kJC9dLFxyXG4gICAgICByZXNvbHZlcnM6IFtcclxuICAgICAgICBBbnREZXNpZ25WdWVSZXNvbHZlcih7XHJcbiAgICAgICAgICBpbXBvcnRTdHlsZTogZmFsc2UgLy8gY3NzIGluIGpzXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgSWNvbnNSZXNvbHZlcih7XHJcbiAgICAgICAgICBwcmVmaXg6ICdpJyxcclxuICAgICAgICAgIGN1c3RvbUNvbGxlY3Rpb25zOiBbJ3N2ZyddLFxyXG4gICAgICAgICAgZW5hYmxlZENvbGxlY3Rpb25zOiBbJ0BpY29uaWZ5LWpzb24vaWMnXVxyXG4gICAgICAgIH0pXHJcbiAgICAgIF0sXHJcbiAgICAgIGV4Y2x1ZGU6IFtdLFxyXG4gICAgICB2ZXJzaW9uOiAzLFxyXG4gICAgICBkdHM6ICdzcmMvY29tcG9uZW50cy5kLnRzJ1xyXG4gICAgfSlcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxyXG4gICAgICAnQGNvbXBvbmVudHMnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjL2NvbXBvbmVudHMnLCBpbXBvcnQubWV0YS51cmwpKSxcclxuICAgICAgJ0Btb2R1bGVzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9tb2R1bGVzJywgaW1wb3J0Lm1ldGEudXJsKSlcclxuICAgIH0sXHJcbiAgICBleHRlbnNpb25zOiBbJy5qcycsICcuanNvbicsICcuanN4JywgJy5tanMnLCAnLnRzJywgJy50c3gnLCAnLnZ1ZScsICcuc2NzcyddXHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcclxuICAgICAgc2Nzczoge1xyXG4gICAgICAgIGFwaTogJ21vZGVybi1jb21waWxlcicsIC8vIG9yIFwibW9kZXJuXCIsIFwibGVnYWN5XCJcclxuICAgICAgICBpbXBvcnRlcnM6IFtcclxuICAgICAgICAgIC8vIC4uLlxyXG4gICAgICAgIF1cclxuICAgICAgfVxyXG4gICAgICAvLyBzYXNzOiB7XHJcbiAgICAgIC8vICAgYWRkaXRpb25hbERhdGE6IGBAaW1wb3J0IFwiQC9zdHlsZXMvdmFyaWFibGVzLnNhc3NcImBcclxuICAgICAgLy8gfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgZGVmaW5lOiB7XHJcbiAgICAncHJvY2Vzcy5lbnYnOiB7XHJcbiAgICAgIE5PREVfRU5WOiAnJyxcclxuICAgICAgVklURV9BUFBfQkFTRV9BUEk6ICcnLFxyXG4gICAgICBWSVRFX0FQUF9CQVNFX0dSQVBIUUxfQVBJOiAnJyxcclxuICAgICAgX19WVUVfUFJPRF9IWURSQVRJT05fTUlTTUFUQ0hfREVUQUlMU19fOiAnZmFsc2UnXHJcbiAgICB9XHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDFcclxuICB9XHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1IsU0FBUyxpQkFBQUEsc0JBQXFCO0FBQ3RULFNBQVMsYUFBYSxnQkFBQUMsZUFBYyxzQkFBc0I7OztBQ0QwTixTQUFTLGVBQWUsT0FBQUMsWUFBVztBQUV2VCxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLE9BQU8saUJBQWlCO0FBRXhCLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sV0FBVztBQUVsQixPQUFPLG1CQUFtQjtBQUMxQixTQUFTLDRCQUE0QjtBQUNyQyxTQUFTLDRCQUE0QjtBQUVyQyxPQUFPLFlBQVk7QUFHbkIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sbUJBQW1CO0FBRTFCLFNBQVMscUJBQXFCO0FBckI2SSxJQUFNLDJDQUEyQztBQXdCNU4sSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsWUFBWTtBQUFBLElBQ1osS0FBSztBQUFBLElBQ0wsY0FBYztBQUFBLElBQ2QsY0FBYztBQUFBO0FBQUEsTUFFWixTQUFTLENBQUM7QUFBQTtBQUFBLE1BRVYsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsTUFDWDtBQUFBO0FBQUEsTUFFQSxpQkFBaUI7QUFBQSxJQUNuQixDQUFDO0FBQUEsSUFDRCxPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsTUFDSixVQUFVO0FBQUEsTUFDVixtQkFBbUI7QUFBQSxRQUNqQixLQUFLLHFCQUFxQix3QkFBd0I7QUFBQSxNQUNwRDtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0QsV0FBVztBQUFBLE1BQ1QsV0FBVyxDQUFDLHFCQUFxQixDQUFDO0FBQUEsTUFDbEMsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxVQUNFLGdCQUFnQixDQUFDLE1BQU07QUFBQSxRQUN6QjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFVBQVU7QUFBQSxRQUNSLFNBQVM7QUFBQSxNQUNYO0FBQUEsTUFDQSxLQUFLO0FBQUE7QUFBQSxNQUNMLE1BQU0sQ0FBQyxvQkFBb0I7QUFBQTtBQUFBLE1BQzNCLGFBQWE7QUFBQSxJQUNmLENBQUM7QUFBQSxJQUNELFdBQVc7QUFBQTtBQUFBLE1BRVQsWUFBWSxDQUFDLE9BQU8sSUFBSTtBQUFBO0FBQUEsTUFFeEIsU0FBUyxDQUFDLFVBQVUsY0FBYyxPQUFPO0FBQUEsTUFDekMsV0FBVztBQUFBLFFBQ1QscUJBQXFCO0FBQUEsVUFDbkIsYUFBYTtBQUFBO0FBQUEsUUFDZixDQUFDO0FBQUEsUUFDRCxjQUFjO0FBQUEsVUFDWixRQUFRO0FBQUEsVUFDUixtQkFBbUIsQ0FBQyxLQUFLO0FBQUEsVUFDekIsb0JBQW9CLENBQUMsa0JBQWtCO0FBQUEsUUFDekMsQ0FBQztBQUFBLE1BQ0g7QUFBQSxNQUNBLFNBQVMsQ0FBQztBQUFBLE1BQ1YsU0FBUztBQUFBLE1BQ1QsS0FBSztBQUFBLElBQ1AsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJQyxLQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLE1BQ3BELGVBQWUsY0FBYyxJQUFJQSxLQUFJLG9CQUFvQix3Q0FBZSxDQUFDO0FBQUEsTUFDekUsWUFBWSxjQUFjLElBQUlBLEtBQUksaUJBQWlCLHdDQUFlLENBQUM7QUFBQSxJQUNyRTtBQUFBLElBQ0EsWUFBWSxDQUFDLE9BQU8sU0FBUyxRQUFRLFFBQVEsT0FBTyxRQUFRLFFBQVEsT0FBTztBQUFBLEVBQzdFO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxxQkFBcUI7QUFBQSxNQUNuQixNQUFNO0FBQUEsUUFDSixLQUFLO0FBQUE7QUFBQSxRQUNMLFdBQVc7QUFBQTtBQUFBLFFBRVg7QUFBQSxNQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFJRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxNQUNWLG1CQUFtQjtBQUFBLE1BQ25CLDJCQUEyQjtBQUFBLE1BQzNCLHlDQUF5QztBQUFBLElBQzNDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFDRixDQUFDOzs7QUR2SDRLLElBQU1DLDRDQUEyQztBQUk5TixJQUFPLHdCQUFRO0FBQUEsRUFDYjtBQUFBLEVBQ0FDLGNBQWE7QUFBQSxJQUNYLE1BQU07QUFBQSxNQUNKLGFBQWE7QUFBQSxNQUNiLFNBQVMsQ0FBQyxHQUFHLGVBQWUsU0FBUyxRQUFRO0FBQUEsTUFDN0MsTUFBTUMsZUFBYyxJQUFJLElBQUksTUFBTUYseUNBQWUsQ0FBQztBQUFBLElBQ3BEO0FBQUEsRUFDRixDQUFDO0FBQ0g7IiwKICAibmFtZXMiOiBbImZpbGVVUkxUb1BhdGgiLCAiZGVmaW5lQ29uZmlnIiwgIlVSTCIsICJVUkwiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCIsICJkZWZpbmVDb25maWciLCAiZmlsZVVSTFRvUGF0aCJdCn0K
