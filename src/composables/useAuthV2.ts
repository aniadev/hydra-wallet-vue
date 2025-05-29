// import telegramHelper, { Constants } from '@/helpers/telegram.helper'
import type { WalletCore } from '@/interface/wallet.type'
import type { WalletAsset } from '@/modules/home/interfaces'
import { defineStore } from 'pinia'
import { CardanoWasm } from './useWalletCore'

export const useAuthV2 = defineStore(
  'auth-v2',
  () => {
    const rootKey = computed({
      get: () => {
        try {
          const rootKey = sessionStorage.getItem('rootKey')
          return CardanoWasm.Bip32PrivateKey.from_hex(rootKey || '')
        } catch (error) {
          console.error('Failed to get root key from session storage', error)
          return null
        }
      },
      set: value => {
        if (!value) {
          sessionStorage.removeItem('rootKey')
          return
        }
        sessionStorage.setItem('rootKey', value.to_hex())
      }
    })
    const currentWallet = ref<WalletCore.WalletAccount | null>(null)
    const currentWalletAddress = ref<WalletCore.WalletAddress | null>(null)
    const walletTokens = ref<WalletAsset[]>([])
    const walletNFTs = ref<WalletAsset[]>([])

    const walletAssets = computed(() => {
      return [...walletTokens.value, ...walletNFTs.value]
    })

    const isLogged = computed(() => {
      return !!currentWallet.value && !!currentWalletAddress.value
    })

    const setCurrentWallet = (wallet: WalletCore.WalletAccount) => {
      currentWallet.value = {
        ...currentWallet.value,
        ...wallet
      }
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

    const login = (wallet: WalletCore.WalletAccount, address: WalletCore.WalletAddress) => {
      setCurrentWallet(wallet)
      setCurrentWalletAddress(address)
    }

    const logout = () => {
      reset()
      // console.log('>>> / file: useAuthV2.ts:34 / telegramHelper:', telegramHelper)
      // if (telegramHelper.ready) {
      //   telegramHelper.storage.removeItems(
      //     [Constants.StorageKeys.WalletData, Constants.StorageKeys.WalletAddress, Constants.StorageKeys.Rootkey],
      //     (err: any, success: any) => {
      //       if (err) {
      //         console.error('Failed to remove wallet data from Telegram storage')
      //       }
      //       if (success) {
      //         console.log('Wallet data removed from Telegram storage')
      //       }
      //     }
      //   )
      // }
    }

    // Telegram config authen
    // if (telegramHelper.ready) {
    //   console.log('[Auth] [Telegram] Telegram is ready')
    // }

    const getPrivateSigningKey = (rootKey: CardanoWasm.Bip32PrivateKey, derivationPath: string[]) => {
      const _deriverationPath = derivationPath.map(path => {
        if (path.includes('H')) {
          return parseInt(path.replace('H', '')) | 0x80000000
        } else {
          return parseInt(path)
        }
      })
      return rootKey
        .derive(_deriverationPath[0])
        .derive(_deriverationPath[1])
        .derive(_deriverationPath[2]) // Account index: 0'
        .derive(_deriverationPath[3]) // 0
        .derive(_deriverationPath[4]) // key index: 0
        .to_raw_key()
    }

    return {
      rootKey,
      currentWallet,
      currentWalletAddress,
      walletAssets,
      walletTokens,
      walletNFTs,
      isLogged,
      setCurrentWallet,
      setCurrentWalletAddress,
      login,
      logout,
      reset,
      getPrivateSigningKey
    }
  },
  {
    // @ts-expect-error
    persist: {
      enabled: true
    }
  }
)
