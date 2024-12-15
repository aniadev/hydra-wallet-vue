import telegramHelper, { Constants } from '@/helpers/telegram.helper'
import { message } from 'ant-design-vue'

export const useTelegram = () => {
  const isInitializingTelegram = ref(true)
  const router = useRouter()
  const route = useRoute()

  async function telegramAuthenticate() {
    return new Promise<Record<string, any>>((resolve, reject) => {
      if (!telegramHelper.ready) {
        reject('Telegram not ready')
      }
      telegramHelper.storage.getItems(
        [Constants.StorageKeys.WalletAddress, Constants.StorageKeys.WalletData],
        (err: any, value: any) => {
          if (err) {
            isInitializingTelegram.value = false
            message.error('Got error while initializing Telegram', 2)
            reject(err)
          }
          if (value) {
            if (!value.walletAddress || !value.walletData) {
              isInitializingTelegram.value = false
              reject('No wallet data found')
            }
            if (value.walletAddress && value.walletData) {
              resolve(value)
            }
            console.log('finish initializing Telegram')
          }
        }
      )
    })
  }

  function checkStartParams() {
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
  }

  function isReady() {
    return telegramHelper.ready
  }

  async function logout() {
    if (isReady()) {
      await removeStorageItem(Constants.StorageKeys.WalletAddress)
      await removeStorageItem(Constants.StorageKeys.WalletData)
    }
  }

  async function removeStorageItem(key: string) {
    return new Promise((resolve, reject) => {
      telegramHelper.storage.removeItem(key, (err: any) => {
        if (err) {
          reject(err)
        }
        resolve(true)
      })
    })
  }

  return {
    telegramAuthenticate,
    checkStartParams,
    isReady,
    logout
  }
}
