import telegramHelper, { Constants } from '@/helpers/telegram.helper'
import { message } from 'ant-design-vue'
import type { RouteLocationRaw } from 'vue-router'

export const useTelegram = () => {
  const isInitializingTelegram = ref(true)

  async function telegramAuthenticate() {
    return new Promise<Record<string, any>>((resolve, reject) => {
      if (!telegramHelper.ready) {
        reject('Telegram not ready')
      }
      telegramHelper.storage.getItems(
        [Constants.StorageKeys.WalletAddress, Constants.StorageKeys.WalletData, Constants.StorageKeys.Rootkey],
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

  function startParamsToRoute(): RouteLocationRaw {
    const startParams = telegramHelper.teleApp.initDataUnsafe.start_param

    if (startParams === 'login') {
      console.log('[App] Redirecting to Login')
      return { name: 'AuthImport' }
    } else if (startParams === 'register') {
      console.log('[App] Redirecting to Register')
      return { name: 'AuthCreate' }
    } else if (startParams === 'send') {
      console.log('[App] Redirecting to Transfer Screen')
      return { name: 'Transfer' }
    } else if (startParams === 'hydratransfer') {
      console.log('[App] Redirecting to HydraFastTransfer')
      return { name: 'HydraFastTransfer' }
    } else if (startParams === 'walletsetting') {
      console.log('[App] Redirecting to Settings')
      return { name: 'Settings' }
    } else if (startParams === 'nfthistory') {
      console.log('[App] Redirecting to NFTs')
      return { name: 'Home', query: { tab: 'NFTs' } }
    } else if (startParams === 'tokenhistory') {
      console.log('[App] Redirecting to NFTs')
      return { name: 'Home', query: { tab: 'NFTs' } }
    } else if (startParams === 'history') {
      console.log('[App] Redirecting to History')
      return { name: 'Home', query: { tab: 'History' } }
    } else {
      console.log(startParams)
      return { name: 'Home' }
    }
  }

  function isReady() {
    return telegramHelper.ready
  }

  async function logout() {
    if (isReady()) {
      await removeStorageItem(Constants.StorageKeys.WalletAddress)
      await removeStorageItem(Constants.StorageKeys.WalletData)
      await removeStorageItem(Constants.StorageKeys.Rootkey)
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
    startParamsToRoute,
    isReady,
    logout
  }
}
