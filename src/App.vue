<script setup lang="ts">
  import { useHead } from '@vueuse/head'
  import { encrypt } from './utils/encrypt'
  import telegramHelper from './helpers/telegram.helper'
  const walletCore = useWalletCore()
  //@ts-ignore
  window.walletCore = walletCore
  //@ts-ignore
  window.encrypt = encrypt

  const APP_VERSION = '2.0.5'
  const APP_NAME = 'Hydra Wallet'
  const APP_URL = 'https://beta.hydrawallet.net/'
  document.title = 'Hydra Wallet - v' + APP_VERSION
  useHead({
    meta: [
      { property: 'og:title', content: `${APP_NAME} - v${APP_VERSION}` },
      { property: 'og:description', content: `${APP_NAME} - v${APP_VERSION}` },
      { property: 'og:image', content: '/assets/svg/logo.svg' },
      { property: 'og:url', content: APP_URL },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: `${APP_NAME} - v${APP_VERSION}` },
      { property: 'og:locale', content: 'vi_VN' },
      //
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:site', content: '@hydra-wallet-app' },
      { name: 'twitter:creator', content: '@hydra-wallet-app' },
      { name: 'twitter:title', content: `${APP_NAME} - v${APP_VERSION}` },
      { name: 'twitter:description', content: `${APP_NAME} - v${APP_VERSION}` },
      { name: 'twitter:image', content: '/assets/svg/logo.svg' },
      { name: 'twitter:url', content: APP_URL }
    ]
  })

  if (telegramHelper.ready) {
    console.log(`[App] Telegram is ready`)
    console.log(`[App] Telegram data:`, telegramHelper.teleApp)
    const router = useRouter()
    const startParams = telegramHelper.teleApp.initDataUnsafe.start_param
    console.log('>>> / file: App.vue:40 / startParams:', startParams)
    switch (startParams) {
      case 'login': {
        console.log(`[App] Redirecting to Login`)
        router.push({ name: 'AuthImport' })
        break
      }
      case 'register': {
        console.log(`[App] Redirecting to Register`)
        router.push({ name: 'AuthCreate' })
        break
      }
      case 'send': {
        console.log(`[App] Redirecting to Transfer Screen`)
        router.push({ name: 'Transfer' })
        break
      }
      case 'hydratransfer': {
        console.log(`[App] Redirecting to HydraFastTransfer`)
        router.push({ name: 'HydraFastTransfer' })
        break
      }
      case 'walletsetting': {
        console.log(`[App] Redirecting to Settings`)
        router.push({ name: 'Settings' })
        break
      }
      case 'nfthistory': {
        console.log(`[App] Redirecting to Settings`)
        router.push({ name: 'Home', query: { tab: 'NFTs' } })
        break
      }
      case 'tokenhistory': {
        console.log(`[App] Redirecting to Settings`)
        router.push({ name: 'Home', query: { tab: 'Tokens' } })
        break
      }
      case 'history': {
        console.log(`[App] Redirecting to Settings`)
        router.push({ name: 'Home', query: { tab: 'History' } })
        break
      }

      default: {
        console.log(startParams)
      }
    }
  }
</script>

<template>
  <router-view></router-view>
</template>
