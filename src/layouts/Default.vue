<script setup lang="ts">
  import type { ConfigProviderProps } from 'ant-design-vue/es'
  import { theme as antdTheme } from 'ant-design-vue'
  import { assetTokens } from '@/constants/asset-tokens'
  import { initListToken } from '@/utils/format'
  // import telegramHelper from '@/helpers/telegram.helper'

  const theme = reactive({
    algorithm: antdTheme.defaultAlgorithm
  })

  const { currentWallet } = useAuthV2()
  const router = useRouter()
  const route = useRoute()

  initListToken(assetTokens, assetTokens)

  onBeforeMount(() => {
    if (!currentWallet) {
      console.log(`[DefaultLayout] No wallet found, redirecting to Auth`)
      const redirect = decodeURIComponent((route.fullPath as string) || '')
      router.push({ name: 'Auth', query: { redirect } })
    } else {
      console.log(`[DefaultLayout] Wallet found, redirecting to Home`)
      // refresh wallet data
    }
  })

  const gameMode = computed(() => {
    return route.meta.gameMode
  })
</script>

<template>
  <a-config-provider :theme="theme">
    <div class="mx-a h-100svh w-full max-w-md bg-white" :class="{ 'game-mode': gameMode }">
      <div class="layout-main-view h-[calc(100%-72px)] w-full transition-all">
        <router-view></router-view>
      </div>
      <div class="h-72px z-1 main-menu relative w-full">
        <MainMenu />
      </div>
    </div>
  </a-config-provider>
</template>

<style lang="scss" scoped>
  .game-mode {
    .layout-main-view {
      height: 100vh !important;
    }
    .main-menu {
      overflow: hidden;
      height: 0 !important;
    }
  }
</style>

<style>
  html {
    --bg-color: #f1f1f1;
  }
  html.dark {
    --bg-color: rgb(42, 44, 44);
    --bg-header-color: rgb(36, 37, 37);
  }

  body {
    background-color: var(--bg-color);
  }
</style>
