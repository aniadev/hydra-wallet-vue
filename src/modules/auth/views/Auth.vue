<script setup lang="ts">
  import BaseLoading from '@/components/base/Loading.vue'

  import telegramHelper, { ready, teleApp } from '@/helpers/telegram.helper'
  const router = useRouter()
  const route = useRoute()

  const isInitializingTelegram = ref(false)
  const inTeleApp = computed(() => !!teleApp)

  onMounted(async () => {
    if (!telegramHelper.ready) return
    // Check if user is already logged in
    console.log('Telegram is ready')

    try {
      isInitializingTelegram.value = true
      await useTelegram().telegramAuthenticate()
    } catch (error) {
      console.error('Error while authenticating telegram', error)
    } finally {
      isInitializingTelegram.value = false
    }

    if (route.query.redirect && router.resolve(decodeURIComponent(route.query.redirect as string))) {
      const path = decodeURIComponent(route.query.redirect as string)
      router.push(path)
    }
    const navigateRoute = useTelegram().startParamsToRoute()
    if (navigateRoute) {
      router.push(navigateRoute)
    }
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
