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
  const gameAccount = ref<GameAccount | null>(null)
  const gameAccessToken = ref('')

  const setAccountLogin = (account: GameAccount, accessToken: string) => {
    isLogin.value = true
    gameAccount.value = account
    gameAccessToken.value = accessToken
    Cookies.set('token', accessToken)
  }

  const setAccountLogout = () => {
    isLogin.value = false
    gameAccount.value = null
    gameAccessToken.value = ''
    Cookies.remove('token')
  }

  return {
    isLogin,
    gameAccount,
    setAccountLogin,
    setAccountLogout
  }
})
