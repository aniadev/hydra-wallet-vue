import { defineStore } from 'pinia'

export const useHydraStore = defineStore('hydra-store', () => {
  const initialData = reactive({
    rootKey: null,
    accountKey: null,
    mnemonic: null,
    passphrase: null
  })

  return {
    initialData
  }
})
