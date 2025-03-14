import type { UTxOObject } from '@/lib/hydra-bridge/types/utxo.type'

export namespace HexcoreDto {
  export namespace GetUtxo {
    type ResponseContent = {
      data: UTxOObject
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }
}
