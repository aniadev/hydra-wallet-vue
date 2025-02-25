import { Address } from '.'
import { Ed25519PrivateKey } from './'

export type Signer = {
  address: Address
  key: Ed25519PrivateKey
}

export type DataSignature = {
  signature: string
  key: string
}

export interface ISigner {
  signData(payload: string, address?: string): Promise<DataSignature>
  signTx(unsignedTx: string, partialSign?: boolean): Promise<string>
  signTxs(unsignedTxs: string[], partialSign?: boolean): Promise<string[]>
}
