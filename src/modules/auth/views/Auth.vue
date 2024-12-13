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
    telegramHelper.storage.getItems(
      [Constants.StorageKeys.WalletAddress, Constants.StorageKeys.WalletData],
      (err: any, value: any) => {
        if (err) {
          console.log('>>> / file: App.vue:20 / err:', err)
          isInitializingTelegram.value = false
          message.error('Got error while initializing Telegram', 2)
          return
        }
        if (value) {
          if (!value.walletAddress || !value.walletData) {
            isInitializingTelegram.value = false
            return
          }
          if (value.walletAddress && value.walletData) {
            const currentWallet = JSON.parse(value.walletData) as WalletCore.WalletAccount
            const walletAddress = value.walletAddress
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
          }

          console.log('finish initializing Telegram')
        }
      }
    )
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
