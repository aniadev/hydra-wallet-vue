import type { ProtocolParameters } from './protocol-parameters.type'
import type { UTxOObject } from './utxo.type'

export type HydraBridgeFetcher = {
  queryProtocolParameters: () => Promise<ProtocolParameters>
  querySnapshotUtxo: () => Promise<UTxOObject>
}
