import Cookies from 'js-cookie'
import { defineStore } from 'pinia'

type GameAccount = {
  id: number
  address: string
  avatar: string | null
  alias: string | null
  createdAt: string
}

export const useGameStore = defineStore('game-store', () => {
  const isLogin = ref(false)
  const gameAccessToken = ref('')
  const gameAccount = useLocalStorage<GameAccount | null>('game-account', null, {
    serializer: {
      read: value => {
        if (!value) return null
        try {
          return JSON.parse(value)
        } catch (error) {
          return null
        }
      },
      write: value => JSON.stringify(value)
    }
  })
  const token = useLocalStorage('token', '')

  const setAccountLogin = (account: GameAccount, accessToken: string) => {
    isLogin.value = true
    gameAccount.value = account
    gameAccessToken.value = accessToken
    token.value = accessToken
  }

  const setAccountLogout = () => {
    isLogin.value = false
    gameAccount.value = null
    gameAccessToken.value = ''
    token.value = ''
  }

  onBeforeMount(() => {
    if (token.value && gameAccount.value) {
      isLogin.value = true
      gameAccessToken.value = token.value
    }
  })

  return {
    isLogin,
    gameAccount,
    setAccountLogin,
    setAccountLogout
  }
})
