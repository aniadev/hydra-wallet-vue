<script setup lang="ts">
  import { useHead } from '@vueuse/head'
  import { encrypt } from './utils/encrypt'
  import telegramHelper from './helpers/telegram.helper'
  import type { WalletCore } from './interface/wallet.type'
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

  const router = useRouter()
  const route = useRoute()
  const auth = useAuthV2()

  onMounted(async () => {
    if (!useTelegram().isReady()) {
      return
    }
    const data = await useTelegram().telegramAuthenticate()

    const currentWallet = JSON.parse(data.walletData) as WalletCore.WalletAccount
    const walletAddress = data.walletAddress
    auth.login(currentWallet, {
      id: currentWallet.id,
      address: walletAddress
    })
    if (route.query.redirect && router.resolve(decodeURIComponent(route.query.redirect as string))) {
      const path = decodeURIComponent(route.query.redirect as string)
      router.push(path)
    } else {
      router.push({ name: 'Home' })
    }
    const startParams = telegramHelper.teleApp.initDataUnsafe.start_param
    if (startParams === 'login') {
      console.log('[App] Redirecting to Login')
      router.push({ name: 'AuthImport' })
    } else if (startParams === 'register') {
      console.log('[App] Redirecting to Register')
      router.push({ name: 'AuthCreate' })
    } else if (startParams === 'send') {
      console.log('[App] Redirecting to Transfer Screen')
      router.push({ name: 'Transfer' })
    } else if (startParams === 'hydratransfer') {
      console.log('[App] Redirecting to HydraFastTransfer')
      router.push({ name: 'HydraFastTransfer' })
    } else if (startParams === 'walletsetting') {
      console.log('[App] Redirecting to Settings')
      router.push({ name: 'Settings' })
    } else if (startParams === 'nfthistory') {
      console.log('[App] Redirecting to Settings')
      router.push({ name: 'Home', query: { tab: 'NFTs' } })
    } else if (startParams === 'tokenhistory') {
      console.log('[App] Redirecting to Settings')
      router.push({ name: 'Home', query: { tab: 'Tokens' } })
    } else if (startParams === 'history') {
      console.log('[App] Redirecting to Settings')
      router.push({ name: 'Home', query: { tab: 'History' } })
    } else {
      console.log(startParams)
    }
  })
</script>

<template>
  <router-view></router-view>
</template>
