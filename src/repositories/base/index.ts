import type { AxiosResponse } from 'axios'
import type { BaseRepositoryInterface } from './index.d'
import { encrypt } from '@/utils/encrypt'

export abstract class BaseRepository implements BaseRepositoryInterface {
  prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  encryptContent(data: Record<string, any>) {
    return encrypt(data)
  }

  errorResponseHandler(error: AxiosResponse<any, any>) {
    const data = error?.data as null | {
      code: string
      message: string
      detail: string | null
    }
    if (data && data.detail) {
      try {
        const detail = JSON.parse(data.detail)
        data.detail = detail
      } catch (error) {
        console.log('Error response handler:', data.detail)
      }
    }
  }
}
