import telegramHelper, { Constants } from '@/helpers/telegram.helper'
import { message } from 'ant-design-vue'

export const useTelegram = () => {
  const isInitializingTelegram = ref(true)

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
    isReady,
    logout
  }
}
