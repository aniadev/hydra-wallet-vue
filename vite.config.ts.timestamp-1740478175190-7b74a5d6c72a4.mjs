// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/vite@5.4.14_@types+node@20.17.19_sass@1.85.0/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/@vitejs+plugin-vue@5.2.1_vite@5.4.14_@types+node@20.17.19_sass@1.85.0__vue@3.5.13_typescript@5.5.4_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/@vitejs+plugin-vue-jsx@4.1.1_vite@5.4.14_@types+node@20.17.19_sass@1.85.0__vue@3.5.13_typescript@5.5.4_/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import vueDevTools from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-vue-devtools@7.7.2_rollup@4.34.8_vite@5.4.14_@types+node@20.17.19_sass@1.85.0__vue@3.5.13_typescript@5.5.4_/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import AutoImport from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unplugin-auto-import@0.18.6_@vueuse+core@12.6.1_typescript@5.5.4__rollup@4.34.8/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unplugin-vue-components@0.27.5_@babel+parser@7.26.9_rollup@4.34.8_vue@3.5.13_typescript@5.5.4_/node_modules/unplugin-vue-components/dist/vite.js";
import Icons from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unplugin-icons@0.19.3_@vue+compiler-sfc@3.5.13/node_modules/unplugin-icons/dist/vite.js";
import IconsResolver from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unplugin-icons@0.19.3_@vue+compiler-sfc@3.5.13/node_modules/unplugin-icons/dist/resolver.js";
import { FileSystemIconLoader } from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unplugin-icons@0.19.3_@vue+compiler-sfc@3.5.13/node_modules/unplugin-icons/dist/loaders.js";
import { AntDesignVueResolver } from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unplugin-vue-components@0.27.5_@babel+parser@7.26.9_rollup@4.34.8_vue@3.5.13_typescript@5.5.4_/node_modules/unplugin-vue-components/dist/resolvers.js";
import UnoCSS from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/unocss@0.63.6_postcss@8.5.2_rollup@4.34.8_typescript@5.5.4_vite@5.4.14_@types+node@20.17.19_sass@1.85.0_/node_modules/unocss/dist/vite.mjs";
import wasm from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-wasm@3.4.1_vite@5.4.14_@types+node@20.17.19_sass@1.85.0_/node_modules/vite-plugin-wasm/exports/import.mjs";
import topLevelAwait from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-top-level-await@1.5.0_rollup@4.34.8_vite@5.4.14_@types+node@20.17.19_sass@1.85.0_/node_modules/vite-plugin-top-level-await/exports/import.mjs";
import { nodePolyfills } from "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/node_modules/.pnpm/vite-plugin-node-polyfills@0.22.0_rollup@4.34.8_vite@5.4.14_@types+node@20.17.19_sass@1.85.0_/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///Users/macbookpro/hdev/workspaces/Vue/hydra-wallet-vue/vite.config.ts";
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
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
      "@components": fileURLToPath(new URL("./src/components", __vite_injected_original_import_meta_url)),
      "@modules": fileURLToPath(new URL("./src/modules", __vite_injected_original_import_meta_url))
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
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjYm9va3Byby9oZGV2L3dvcmtzcGFjZXMvVnVlL2h5ZHJhLXdhbGxldC12dWVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWNib29rcHJvL2hkZXYvd29ya3NwYWNlcy9WdWUvaHlkcmEtd2FsbGV0LXZ1ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFjYm9va3Byby9oZGV2L3dvcmtzcGFjZXMvVnVlL2h5ZHJhLXdhbGxldC12dWUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHZ1ZUpzeCBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUtanN4J1xuaW1wb3J0IHZ1ZURldlRvb2xzIGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZS1kZXZ0b29scydcblxuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSAndW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgSWNvbnMgZnJvbSAndW5wbHVnaW4taWNvbnMvdml0ZSdcblxuaW1wb3J0IEljb25zUmVzb2x2ZXIgZnJvbSAndW5wbHVnaW4taWNvbnMvcmVzb2x2ZXInXG5pbXBvcnQgeyBGaWxlU3lzdGVtSWNvbkxvYWRlciB9IGZyb20gJ3VucGx1Z2luLWljb25zL2xvYWRlcnMnXG5pbXBvcnQgeyBBbnREZXNpZ25WdWVSZXNvbHZlciB9IGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3Jlc29sdmVycydcblxuaW1wb3J0IFVub0NTUyBmcm9tICd1bm9jc3Mvdml0ZSdcblxuLy8gU0RLXG5pbXBvcnQgd2FzbSBmcm9tICd2aXRlLXBsdWdpbi13YXNtJ1xuaW1wb3J0IHRvcExldmVsQXdhaXQgZnJvbSAndml0ZS1wbHVnaW4tdG9wLWxldmVsLWF3YWl0J1xuLy8gaW1wb3J0IHsgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbiB9IGZyb20gJ0Blc2J1aWxkLXBsdWdpbnMvbm9kZS1nbG9iYWxzLXBvbHlmaWxsJ1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gJ3ZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzJ1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICB2dWVKc3goKSxcbiAgICB2dWVEZXZUb29scygpLFxuICAgIHdhc20oKSxcbiAgICB0b3BMZXZlbEF3YWl0KCksXG4gICAgbm9kZVBvbHlmaWxscyh7XG4gICAgICAvLyBTcGVjaWZpYyBtb2R1bGVzIHRoYXQgc2hvdWxkIG5vdCBiZSBwb2x5ZmlsbGVkLlxuICAgICAgZXhjbHVkZTogW10sXG4gICAgICAvLyBXaGV0aGVyIHRvIHBvbHlmaWxsIHNwZWNpZmljIGdsb2JhbHMuXG4gICAgICBnbG9iYWxzOiB7XG4gICAgICAgIEJ1ZmZlcjogdHJ1ZSwgLy8gY2FuIGFsc28gYmUgJ2J1aWxkJywgJ2RldicsIG9yIGZhbHNlXG4gICAgICAgIGdsb2JhbDogdHJ1ZSxcbiAgICAgICAgcHJvY2VzczogdHJ1ZVxuICAgICAgfSxcbiAgICAgIC8vIFdoZXRoZXIgdG8gcG9seWZpbGwgYG5vZGU6YCBwcm90b2NvbCBpbXBvcnRzLlxuICAgICAgcHJvdG9jb2xJbXBvcnRzOiB0cnVlXG4gICAgfSksXG4gICAgVW5vQ1NTKCksXG4gICAgSWNvbnMoe1xuICAgICAgY29tcGlsZXI6ICd2dWUzJyxcbiAgICAgIGN1c3RvbUNvbGxlY3Rpb25zOiB7XG4gICAgICAgIHN2ZzogRmlsZVN5c3RlbUljb25Mb2FkZXIoJy4vc3JjL2Fzc2V0cy9pY29ucy9zdmcnKVxuICAgICAgfVxuICAgIH0pLFxuICAgIEF1dG9JbXBvcnQoe1xuICAgICAgcmVzb2x2ZXJzOiBbQW50RGVzaWduVnVlUmVzb2x2ZXIoKV0sXG4gICAgICBpbXBvcnRzOiBbXG4gICAgICAgICd2dWUnLFxuICAgICAgICAndnVlLXJvdXRlcicsXG4gICAgICAgICdAdnVldXNlL2NvcmUnLFxuICAgICAgICB7XG4gICAgICAgICAgJ0BpY29uaWZ5L3Z1ZSc6IFsnSWNvbiddXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBlc2xpbnRyYzoge1xuICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICB9LFxuICAgICAgZHRzOiAnc3JjL2F1dG8taW1wb3J0cy5kLnRzJywgLy8gcGx1Z2lucyBuXHUwMEUweSBzXHUxRUJEIHRcdTFFRjEgXHUwMTExXHUxRUQ5bmcgZ2VuZXJhdGVkIHJhIGZpbGUgYXV0by1pbXBvcnRzLmQudHMgdHJvbmcgc291cmNlIHNyYy5cbiAgICAgIGRpcnM6IFsnc3JjL2NvbXBvc2FibGVzLyoqJ10sIC8vIGNoXHUxRUQ3IG5cdTAwRTB5IG1cdTAwRUNuaCBjXHUwMEYzIHRoXHUxRUMzIHRoXHUwMEVBbSBuYW1lIGZvbGRlciBuXHUwMEYzIHNcdTFFQkQgdFx1MUVGMSBcdTAxMTFcdTFFRDluZyBsXHUxRUE1eSB0XHUxRUE1dCBjXHUxRUEzIGNcdTAwRTFjIHRcdTAwRUFuIGZpbGUgdHJvbmcgZm9sZGVyIFx1MDExMVx1MDBGMyB2XHUwMEUwIG1cdTAwRUNuaCBjXHUwMEYzIHRoXHUxRUMzIGdcdTFFQ0RpIGJcdTFFQTV0IGtcdTAwRUMgXHUxRURGIHRyb25nIGZpbGUgVnVlIG5cdTAwRTBvIG1cdTAwRTAga2hcdTAwRjRuZyBjXHUxRUE3biBpbXBvcnQuIChzcmMvc3RvcmVzKVxuICAgICAgdnVlVGVtcGxhdGU6IHRydWVcbiAgICB9KSxcbiAgICBDb21wb25lbnRzKHtcbiAgICAgIC8vIGFsbG93IGF1dG8gbG9hZCBtYXJrZG93biBjb21wb25lbnRzIHVuZGVyIGAuL3NyYy9jb21wb25lbnRzL2BcbiAgICAgIGV4dGVuc2lvbnM6IFsndnVlJywgJ21kJ10sXG4gICAgICAvLyBhbGxvdyBhdXRvIGltcG9ydCBhbmQgcmVnaXN0ZXIgY29tcG9uZW50cyB1c2VkIGluIG1hcmtkb3duXG4gICAgICBpbmNsdWRlOiBbL1xcLnZ1ZSQvLCAvXFwudnVlXFw/dnVlLywgL1xcLm1kJC9dLFxuICAgICAgcmVzb2x2ZXJzOiBbXG4gICAgICAgIEFudERlc2lnblZ1ZVJlc29sdmVyKHtcbiAgICAgICAgICBpbXBvcnRTdHlsZTogZmFsc2UgLy8gY3NzIGluIGpzXG4gICAgICAgIH0pLFxuICAgICAgICBJY29uc1Jlc29sdmVyKHtcbiAgICAgICAgICBwcmVmaXg6ICdpJyxcbiAgICAgICAgICBjdXN0b21Db2xsZWN0aW9uczogWydzdmcnXSxcbiAgICAgICAgICBlbmFibGVkQ29sbGVjdGlvbnM6IFsnQGljb25pZnktanNvbi9pYyddXG4gICAgICAgIH0pXG4gICAgICBdLFxuICAgICAgZXhjbHVkZTogW10sXG4gICAgICB2ZXJzaW9uOiAzLFxuICAgICAgZHRzOiAnc3JjL2NvbXBvbmVudHMuZC50cydcbiAgICB9KVxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgJ0Bjb21wb25lbnRzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9jb21wb25lbnRzJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICAnQG1vZHVsZXMnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjL21vZHVsZXMnLCBpbXBvcnQubWV0YS51cmwpKVxuICAgIH0sXG4gICAgZXh0ZW5zaW9uczogWycuanMnLCAnLmpzb24nLCAnLmpzeCcsICcubWpzJywgJy50cycsICcudHN4JywgJy52dWUnLCAnLnNjc3MnXVxuICB9LFxuICBjc3M6IHtcbiAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICBzY3NzOiB7XG4gICAgICAgIGFwaTogJ21vZGVybi1jb21waWxlcicsIC8vIG9yIFwibW9kZXJuXCIsIFwibGVnYWN5XCJcbiAgICAgICAgaW1wb3J0ZXJzOiBbXG4gICAgICAgICAgLy8gLi4uXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIC8vIHNhc3M6IHtcbiAgICAgIC8vICAgYWRkaXRpb25hbERhdGE6IGBAaW1wb3J0IFwiQC9zdHlsZXMvdmFyaWFibGVzLnNhc3NcImBcbiAgICAgIC8vIH1cbiAgICB9XG4gIH0sXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudic6IHtcbiAgICAgIE5PREVfRU5WOiAnJyxcbiAgICAgIFZJVEVfQVBQX0JBU0VfQVBJOiAnJyxcbiAgICAgIFZJVEVfQVBQX0JBU0VfR1JBUEhRTF9BUEk6ICcnLFxuICAgICAgX19WVUVfUFJPRF9IWURSQVRJT05fTUlTTUFUQ0hfREVUQUlMU19fOiAnZmFsc2UnXG4gICAgfVxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAxXG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9WLFNBQVMsZUFBZSxXQUFXO0FBRXZYLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUNoQixPQUFPLFlBQVk7QUFDbkIsT0FBTyxpQkFBaUI7QUFFeEIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxXQUFXO0FBRWxCLE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMsNEJBQTRCO0FBQ3JDLFNBQVMsNEJBQTRCO0FBRXJDLE9BQU8sWUFBWTtBQUduQixPQUFPLFVBQVU7QUFDakIsT0FBTyxtQkFBbUI7QUFF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
