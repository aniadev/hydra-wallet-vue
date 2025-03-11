import type { HydraBridge } from '..'
import type { HydraBridgeFetcher } from '../types/fetcher.type'
import type { ProtocolParameters } from '../types/protocol-parameters.type'

export const defaultFetcher = (hydraBridge: HydraBridge): HydraBridgeFetcher => {
  return {
    queryProtocolParameters: async () => {
      try {
        const rs = await hydraBridge.apiFetch.get('/protocol-parameters')
        if (rs.status !== 200) {
          throw new Error('Failed to query protocol parameters')
        }
        return rs.data as ProtocolParameters
      } catch (error) {
        throw new Error('[HydraBridgeFetcher][QueryProtocolParameters]: ' + error)
      }
    },
    querySnapshotUtxo: async () => {
      try {
        const rs = await hydraBridge.apiFetch.get('/snapshot/utxo')
        if (rs.status !== 200) {
          throw new Error('Failed to query snapshot utxo')
        }
        return rs.data
      } catch (error) {
        throw new Error('[HydraBridgeFetcher][QuerySnapshotUtxo]: ' + error)
      }
    }
  }
}
