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
    useTelegram().checkStartParams()
  })
</script>

<template>
  <router-view></router-view>
</template>
