import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'

import IconsResolver from 'unplugin-icons/resolver'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import svgLoader from 'vite-svg-loader'

import UnoCSS from 'unocss/vite'

// SDK
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
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
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true
    }),
    UnoCSS(),
    Icons({
      compiler: 'vue3',
      customCollections: {
        svg: FileSystemIconLoader('./src/assets/icons/svg')
      }
    }),
    svgLoader({
      svgoConfig: {
        multipass: true
      }
    }),
    AutoImport({
      resolvers: [AntDesignVueResolver()],
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        {
          '@iconify/vue': ['Icon']
        }
      ],
      eslintrc: {
        enabled: true
      },
      dts: 'src/auto-imports.d.ts', // plugins này sẽ tự động generated ra file auto-imports.d.ts trong source src.
      dirs: ['src/composables/**'], // chỗ này mình có thể thêm name folder nó sẽ tự động lấy tất cả các tên file trong folder đó và mình có thể gọi bất kì ở trong file Vue nào mà không cần import. (src/stores)
      vueTemplate: true
    }),
    Components({
      // allow auto load markdown components under `./src/components/`
      extensions: ['vue', 'md'],
      // allow auto import and register components used in markdown
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        AntDesignVueResolver({
          importStyle: false // css in js
        }),
        IconsResolver({
          prefix: 'i',
          customCollections: ['svg'],
          enabledCollections: ['@iconify-json/ic']
        })
      ],
      exclude: [],
      version: 3,
      dts: 'src/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url))
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue', '.scss']
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // or "modern", "legacy"
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
    'process.env': {
      NODE_ENV: '',
      VITE_APP_BASE_API: '',
      VITE_APP_BASE_GRAPHQL_API: '',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    }
  },
  server: {
    port: 3001
  }
})
