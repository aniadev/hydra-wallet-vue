import { defineStore } from 'pinia'
import { useGameRPSStore } from '.'

export const useMessageStore = defineStore('message-store', () => {
  const gameStore = useGameRPSStore()

  const messages = ref<string[]>([])

  return { messages }
})
