import type { Transaction } from './transaction.type'
import type { UTxOObject } from './utxo.type'

/**
 * Draft a commit transaction, which can be completed and later submitted to the L1 network.
 */
export type CommitBody = EmptyCommitBody | UtxoCommitBody

type EmptyCommitBody = {}
type UtxoCommitBody = UTxOObject

/**
 * `draftCommitTxResponse`
 */
export type CommitResponse = Omit<Transaction, 'txId'> & { txId?: string }
