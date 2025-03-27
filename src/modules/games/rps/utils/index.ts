import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'
import type { InlineDatum } from '../types/game.type'
import type { Bip32PrivateKey } from '@/lib/types'

export const buildSnapshotUtxoArray = (snapshot: UTxOObject) => {
  const txIds = Object.keys(snapshot) as TxHash[]
  return txIds.map(txId => {
    const [txHash, txIndex] = txId.split('#')
    const utxo = snapshot[txId]
    return {
      txHash,
      txIndex: parseInt(txIndex),
      data: utxo
    }
  })
}

export function getInlineDatumObj(utxoValue: UTxOObjectValue): InlineDatum | null {
  const inlineDatum = utxoValue.inlineDatum
  if (!inlineDatum || !('bytes' in inlineDatum)) return null
  const inlineDatumJsonData = Buffer.from(inlineDatum.bytes, 'hex').toString('utf-8')
  try {
    return JSON.parse(inlineDatumJsonData) as InlineDatum
  } catch (e) {
    throw new Error('Error parsing inlineDatum')
  }
}
