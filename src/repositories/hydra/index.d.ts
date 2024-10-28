import { HydraState as HydraStateType, UtxoObject, UtxoObjectValue } from '@modules/hydra/interfaces'

export namespace HydraDto {
  export namespace GetUtxo {
    type RequestContent = {
      address: string
    }

    type ResponseContent = {
      txHash: string
      blockHash: string
      address: string
      txIndex: number
      value: number
    }[]
  }

  export namespace HydraState {
    type RequestContent = {}

    type ResponseContent = HydraStateType
  }

  export namespace OpenHydraHead {
    type RequestContent = {
      mnemonic: string
      address: string
      derivationPath: string[]
      transaction: {
        txId: string
        index: number
        value: number
      }
    }

    type ResponseContent = {}
  }

  export namespace Commit {
    type RequestContent = {
      txId: string
      utxo: UtxoObject
    }

    type ResponseContent = {}
  }

  export namespace Submit {
    // TODO: Update request content type and response content type
    type RequestContent = {}

    type ResponseContent = {}
  }

  export namespace SnapshotUtxo {
    type RequestContent = {}

    type ResponseContent = {}
  }

  export namespace Construct {
    type RequestContent = {
      sender: string
      receiver: string
      /**
       * Amount in lovelace
       * @example 1000000 lovelace = 1 ADA
       */
      amount: number
      /**
       * TODO: Bỏ mnemonic và derivationPath và sign dưới client
       */
      mnemonic: string
      derivationPath: string[]
      utxo?: {
        txIdWithIndex: string
        utxo: UtxoObjectValue
      }
    }

    type ResponseContent = string
  }

  export namespace Transfer {
    type RequestContent = {
      cborHex: string
    }

    type ResponseContent = {
      txId: string
      valid: boolean
      message: string
    }
  }

  export namespace Close {
    type RequestContent = {}

    type ResponseContent = unknown
  }
}
