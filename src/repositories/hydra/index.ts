import { $axios } from '@/utils/axios'
import { BaseRepository } from '../base'
import type { HydraDto } from './index.d'
import { recursiveToCamel } from '@/utils/format'

export class HydraRepository extends BaseRepository {
  constructor() {
    super('/hydra')
  }

  async getListUtxo(walletId: string, content: HydraDto.GetUtxo.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post(`${this.prefix}/transactions`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/transactions/UTxOs',
        walletId
      })
      const _camelizeRs = recursiveToCamel(rs) as HydraDto.GetUtxo.ResponseContent
      return Promise.resolve(_camelizeRs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async getHydraState(walletId: string, content: HydraDto.HydraState.RequestContent = {}) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.HydraState.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/state',
        walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  async openHydraHead(walletId: string, content: HydraDto.OpenHydraHead.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.OpenHydraHead.ResponseContent>(
        `${this.prefix}/commands`,
        {
          content: encryptedData?.encryptedData,
          contentKey: encryptedData?.encryptedAesKey,
          requestType: 'hydra/commands/open',
          walletId
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
  async commit(walletId: string, content: HydraDto.Commit.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Commit.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/commit',
        walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  // TODO: Update request content type and response content type
  async submit(walletId: string, content: HydraDto.Commit.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Commit.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/commit',
        walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  // TODO: Chưa làm
  async snapshotUtxo(walletId: string, content: HydraDto.SnapshotUtxo.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.SnapshotUtxo.ResponseContent>(`${this.prefix}/transactions`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/transactions/snapshotTxs',
        walletId
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
  async construct(walletId: string, content: HydraDto.Construct.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Construct.ResponseContent>(`${this.prefix}/transactions`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/transactions/construct',
        walletId
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
  async transfer(walletId: string, content: HydraDto.Transfer.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, HydraDto.Transfer.ResponseContent>(`${this.prefix}/commands`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'hydra/commands/transfer',
        walletId
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
