import { $axios } from '@/utils/axios'
import { BaseRepository } from '../base'
import type { HydraDto } from './index.d'

export class HydraRepository extends BaseRepository {
  constructor() {
    super('/hydra')
  }

  async getListUtxo(content: HydraDto.GetUtxo.RequestContent): Promise<HydraDto.GetUtxo.ResponseContent> {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = (await $axios.post(`${this.prefix}/transactions`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/transactions/UTxOs'
      })) as string
      const objData = JSON.parse(rs)
      return Promise.resolve(objData)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async getHydraState(content: HydraDto.HydraState.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.HydraState.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/state'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async openHydraHead(content: HydraDto.OpenHydraHead.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.OpenHydraHead.ResponseContent>(
        `${this.prefix}/commands`,
        {
          content: encryptedData?.encryptedData,
          contentKey: encryptedData?.encryptedAesKey,
          requestType: 'hydra/commands/open'
        },
        {
          timeout: 300000
        }
      )
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  // TODO: Update request content type and response content type
  async commit(content: HydraDto.Commit.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Commit.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/commit'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  // TODO: Update request content type and response content type
  async submit(content: HydraDto.Commit.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Commit.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/commit'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  // TODO: Chưa làm
  async snapshotUtxo(content: HydraDto.SnapshotUtxo.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.SnapshotUtxo.ResponseContent>(`${this.prefix}/transactions`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/transactions/snapshotTxs'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   * Trả về cBor đã signed
   * TODO: Không gửi kèm mnemonic nữa mà chỉ lấy unwitnessed tx và tự sign dưới client
   */
  async construct(content: HydraDto.Construct.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Construct.ResponseContent>(`${this.prefix}/transactions`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/transactions/construct'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   *
   */
  async transfer(content: HydraDto.Transfer.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Transfer.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/transfer'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   *
   */
  async close(content: HydraDto.Close.RequestContent = {}) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Close.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/close'
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }
}
