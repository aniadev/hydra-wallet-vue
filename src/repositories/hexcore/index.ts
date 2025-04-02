import { AxiosInstance } from '@/utils/axios'
import { BaseRepository } from '../base'
import type { HexcoreDto } from './index.d'

export class HexcoreRepository extends BaseRepository {
  hexcoreApiEndpoint = import.meta.env.VITE_APP_HYDRA_HEXCORE_API_ENDPOINT
  axios = new AxiosInstance('', this.hexcoreApiEndpoint).instance
  constructor() {
    super('/hydra-main')
  }

  async getUtxo(address: string) {
    try {
      const rs = await this.axios.get<any, HexcoreDto.GetUtxo.ResponseContent>(`${this.prefix}/utxo/${address}`)
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }
}
