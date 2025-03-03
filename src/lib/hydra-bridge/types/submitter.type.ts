import type { CommitBody, CommitResponse } from './commit.type'
import type { SubmitTxBody, SubmitTxResponse } from './submit-tx.type'

export type HydraBridgeSubmitter = {
  commit: (data: CommitBody) => Promise<CommitResponse | null>
  submitCardanoTx: (data: SubmitTxBody) => Promise<SubmitTxResponse | null>
}
