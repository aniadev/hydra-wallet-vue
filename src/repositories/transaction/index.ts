import { $axios } from '@/utils/axios'
import { BaseRepository } from '../base'
import type { TransactionDto } from './index.d'

export class TxsRepository extends BaseRepository {
  constructor() {
    super('/cardano/transactions')
  }

  async estimateFee(walletId: string, content: TransactionDto.EstimateFee.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, TransactionDto.EstimateFee.ResponseContent>(`${this.prefix}`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'wallets/transactions/estimate-fee',
        walletId: walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   * @description Create and send transaction from the wallet.
   */
  async createTransaction(walletId: string, content: TransactionDto.CreateTransaction.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, TransactionDto.CreateTransaction.ResponseContent>(`${this.prefix}`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'wallets/transactions/create',
        walletId: walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   * @description Lists all incoming and outgoing wallet's transactions.
   */
  async getListTransaction(walletId: string, content: TransactionDto.ListTransaction.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, TransactionDto.ListTransaction.ResponseContent>(`${this.prefix}`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'wallets/transactions/list',
        walletId: walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   *
   * @description Create a transaction to be signed from the wallet.
   */
  async constructTransaction(walletId: string, content: TransactionDto.ConstructTransaction.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, TransactionDto.ConstructTransaction.ResponseContent>(`${this.prefix}`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'wallets/transactions/create',
        walletId: walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }

  /**
   *
   * @description Create a transaction to be signed from the wallet.
   */
  async signTransaction(walletId: string, content: TransactionDto.SignTransaction.RequestContent) {
    try {
      const encryptedData = this.encryptContent(content)
      const rs = await $axios.post<any, TransactionDto.SignTransaction.ResponseContent>(`${this.prefix}`, {
        content: encryptedData?.encryptedData,
        contentKey: encryptedData?.encryptedAesKey,
        requestType: 'wallets/transactions/sign',
        walletId: walletId
      })
      return Promise.resolve(rs)
    } catch (error: any) {
      this.errorResponseHandler(error)
      return Promise.reject(error)
    }
  }
}
