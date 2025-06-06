import { AxiosInstance } from '@/utils/axios'
import { BaseRepository } from '../base'
import type { HydraGameDto } from './index.d'
import { Popups } from '@/enums/popups.enum'
import { useGameStore } from '@/modules/games/stores/gameStore'

export class HydraGameRepository extends BaseRepository {
  hydraGameApiEndpoint = import.meta.env.VITE_APP_HYDRA_GAME_API_ENDPOINT
  axios = new AxiosInstance('', this.hydraGameApiEndpoint).instance
  constructor() {
    super('')

    this.axios.interceptors.request.use(request => {
      return request
    })
    this.axios.interceptors.response.use(
      response => {
        return response
      },
      async error => {
        // error response handler
        console.log('Repository response:', error)
        // if (error?.status === 401) {
        //   useGameStore().setAccountLogout()
        //   location.replace('/games')
        //   usePopupState(Popups.POPUP_GAME_LOGIN, 'open')
        // }
        return Promise.reject(error.data)
      }
    )
  }

  async checkAccountExisted(address: string) {
    try {
      const rs = await this.axios.get<any, HydraGameDto.CheckAccountExisted.ResponseContent>(
        `${this.prefix}/auth/account/${address}`
      )
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async getAccountInfo(accessToken: string) {
    try {
      this.axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`
      const rs = await this.axios.get<any, HydraGameDto.GetAccountInfo.ResponseContent>(`${this.prefix}/auth`)
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async createAccount(body: HydraGameDto.CreateAccount.RequestContent) {
    try {
      const rs = await this.axios.post<any, HydraGameDto.CreateAccount.ResponseContent>(
        `${this.prefix}/auth/register`,
        body
      )
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async signIn(body: HydraGameDto.SignIn.RequestContent) {
    try {
      const rs = await this.axios.post<any, HydraGameDto.SignIn.ResponseContent>(`${this.prefix}/auth/login`, body)
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  // APIs for game rock-paper-scissors
  async getGameRooms() {
    try {
      const rs = await this.axios.get<any, HydraGameDto.GetGameRooms.ResponseContent>(`${this.prefix}/rooms`)
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async getGameRoomDetail(roomId: number) {
    try {
      const rs = await this.axios.get<any, HydraGameDto.GetGameRoomDetail.ResponseContent>(
        `${this.prefix}/room/${roomId}`
      )
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }
}
