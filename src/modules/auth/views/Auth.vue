<script setup lang="ts">
  import BaseLoading from '@/components/base/Loading.vue'

  import telegramHelper, { initializeTelegram, ready, teleApp, Constants } from '@/helpers/telegram.helper'
  import type { WalletCore } from '@/interface/wallet.type'
  import { message } from 'ant-design-vue'
  const auth = useAuthV2()
  const router = useRouter()
  const route = useRoute()

  const isInitializingTelegram = ref(false)
  const inTeleApp = computed(() => !!teleApp)

  onMounted(() => {
    initializeTelegram()
    if (!telegramHelper.ready) return
    // Check if user is already logged in
    console.log('Telegram is ready')
    isInitializingTelegram.value = true
    useTelegram()
      .telegramAuthenticate()
      .then()
      .catch()
      .finally(() => {
        isInitializingTelegram.value = false
      })
    //   .then(rs => {
    //     const startParams = telegramHelper.teleApp.initDataUnsafe.start_param
    //     console.log('>>> / file: App.vue:40 / startParams:', startParams)
    //     if (startParams === 'login') {
    //       console.log('[App] Redirecting to Login')
    //       router.push({ name: 'AuthImport' })
    //     } else if (startParams === 'register') {
    //       console.log('[App] Redirecting to Register')
    //       router.push({ name: 'AuthCreate' })
    //     } else if (startParams === 'send') {
    //       console.log('[App] Redirecting to Transfer Screen')
    //       router.push({ name: 'Transfer' })
    //     } else if (startParams === 'hydratransfer') {
    //       console.log('[App] Redirecting to HydraFastTransfer')
    //       router.push({ name: 'HydraFastTransfer' })
    //     } else if (startParams === 'walletsetting') {
    //       console.log('[App] Redirecting to Settings')
    //       router.push({ name: 'Settings' })
    //     } else if (startParams === 'nfthistory') {
    //       console.log('[App] Redirecting to Settings')
    //       router.push({ name: 'Home', query: { tab: 'NFTs' } })
    //     } else if (startParams === 'tokenhistory') {
    //       console.log('[App] Redirecting to Settings')
    //       router.push({ name: 'Home', query: { tab: 'Tokens' } })
    //     } else if (startParams === 'history') {
    //       console.log('[App] Redirecting to Settings')
    //       router.push({ name: 'Home', query: { tab: 'History' } })
    //     } else {
    //       console.log(startParams)
    //     }
    //   })
    //   .catch(err => {
    //     console.log('>>> / file: App.vue:20 / err:', err)
    //   })
    //   .finally(() => {
    //     isInitializingTelegram.value = false
    //   })
  })

  function goToLogin() {
    const redirectTo = route.query.redirect as string
    router.push({ name: 'AuthImport', query: { redirect: redirectTo } })
  }

  function goToRegister() {
    const redirectTo = route.query.redirect as string
    router.push({ name: 'AuthCreate', query: { redirect: redirectTo } })
  }
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between p-4 shadow-xl">
    <div class="flex justify-end" v-if="inTeleApp && !isInitializingTelegram">
      <a-button type="ghost" class="" size="large" @click="goToLogin()">Login</a-button>
    </div>
    <div class="flex flex-col items-center">
      <img src="/images/wallet-logo.png" alt="LOGO" class="w-80 object-contain" />
      <p class="text-title-1 font-700 mb-0 text-center">HYDRA Wallet</p>
      <p class="text-body-1 font-700 text-center">
        Next generation Telegram wallet. <br />Secure, Fast and over the Cardano Blockchain
      </p>
      <p class="text-body-1 font-400 text-center" v-if="inTeleApp && ready">
        Welcome back,
        <span class="text-primary">@{{ teleApp.initDataUnsafe.user?.username }}</span>
      </p>
      <p class="text-body-1 font-400 text-center" v-if="inTeleApp && isInitializingTelegram">
        Telegram is initializing...
      </p>
      <base-loading v-if="inTeleApp && isInitializingTelegram" :size="20" />
    </div>
    <div class="w-full" v-if="inTeleApp && !isInitializingTelegram">
      <a-button type="primary" class="!rounded-4 btn-secondary !h-[56px] w-full" size="large" @click="goToRegister()">
        Create new account
      </a-button>
    </div>
  </div>
</template>
