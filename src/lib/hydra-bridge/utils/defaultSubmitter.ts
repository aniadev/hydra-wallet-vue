import type { HydraBridge } from '..'
import type { CommitResponse } from '../types/commit.type'
import type { SubmitTxResponse } from '../types/submit-tx.type'
import type { HydraBridgeSubmitter } from '../types/submitter.type'

export const defaultSubmitter = (hydraBridge: HydraBridge): HydraBridgeSubmitter => {
  return {
    commit: async data => {
      try {
        const rs = await hydraBridge.apiFetch.post('/commit', data)
        if (rs.status !== 200) {
          throw new Error('Failed to commit utxo to hydra node')
        }
        return rs.data as CommitResponse
      } catch (error) {
        console.error('[HydraBridgeSubmitter][Commit]: ', error)
        return null
      }
    },
    submitCardanoTx: async data => {
      try {
        const rs = await hydraBridge.apiFetch.post('/cardano-transaction', data)
        if (rs.status !== 200) {
          throw new Error('Failed to submit transaction')
        }
        return rs.data as SubmitTxResponse
      } catch (error) {
        console.error('[HydraBridgeSubmitter][SubmitCardanoTransaction]: ', error)
        return null
      }
    }
  }
}
