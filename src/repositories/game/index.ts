import { AxiosInstance } from '@/utils/axios'
import { BaseRepository } from '../base'
import type { HydraGameDto } from './index.d'

export class HydraGameRepository extends BaseRepository {
  axios = new AxiosInstance('', 'https://hexcore.hdev99.io.vn/').instance
  constructor() {
    super('/hydra-game')
  }

  async getAccountInfo(address: string) {
    try {
      const rs = await this.axios.get<any, HydraGameDto.GetAccountInfo.ResponseContent>(
        `${this.prefix}/address/${address}`
      )
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async createAccount(body: HydraGameDto.CreateAccount.RequestContent) {
    try {
      const rs = await this.axios.post<any, HydraGameDto.CreateAccount.ResponseContent>(
        `${this.prefix}/create-user`,
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
      const rs = await this.axios.post<any, HydraGameDto.SignIn.ResponseContent>(`${this.prefix}/login`, body)
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
