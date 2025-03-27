import { blake2b } from '@cardano-sdk/crypto'
import { deserializeTx } from './deserializer'
import { hexToBytes } from './parser'
import { Cardano } from '@cardano-sdk/core'
import { HexBlob } from '@cardano-sdk/util'

export const resolveTxHash = (txHex: string) => {
  const txBody = deserializeTx(txHex).body()
  const hash = blake2b(blake2b.BYTES).update(hexToBytes(txBody.toCbor())).digest()
  return Cardano.TransactionId.fromHexBlob(HexBlob.fromBytes(hash)).toString()
}
