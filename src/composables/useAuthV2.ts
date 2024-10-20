import telegramHelper, { Constants } from '@/helpers/telegram.helper'
import type { WalletCore } from '@/interface/wallet.type'
import { defineStore } from 'pinia'

export const useAuthV2 = defineStore(
  'auth-v2',
  () => {
    const currentWallet = ref<WalletCore.WalletAccount | null>(null)
    const currentWalletAddress = ref<WalletCore.WalletAddress | null>(null)
    const setCurrentWallet = (wallet: WalletCore.WalletAccount) => {
      currentWallet.value = wallet
    }
    const setCurrentWalletAddress = (address: WalletCore.WalletAddress) => {
      if (!currentWallet.value) {
        console.error('Current wallet is not set')
        return
      }
      currentWalletAddress.value = address
    }

    const reset = () => {
      currentWallet.value = null
      currentWalletAddress.value = null
    }

    const login = (
      wallet: WalletCore.WalletAccount,
      address: WalletCore.WalletAddress,
    ) => {
      setCurrentWallet(wallet)
      setCurrentWalletAddress(address)
    }

    const logout = () => {
      reset()
      console.log(
        '>>> / file: useAuthV2.ts:34 / telegramHelper:',
        telegramHelper,
      )
      if (telegramHelper.ready) {
        telegramHelper.storage.removeItems(
          [
            Constants.StorageKeys.WalletData,
            Constants.StorageKeys.WalletAddress,
          ],
          (err: any, success: any) => {
            if (err) {
              console.error(
                'Failed to remove wallet data from Telegram storage',
              )
            }
            if (success) {
              console.log('Wallet data removed from Telegram storage')
            }
          },
        )
      }
    }

    return {
      currentWallet,
      currentWalletAddress,
      setCurrentWallet,
      setCurrentWalletAddress,
      login,
      logout,
      reset,
    }
  },
  {
    // @ts-expect-error
    persist: {
      enabled: true,
    },
  },
)
