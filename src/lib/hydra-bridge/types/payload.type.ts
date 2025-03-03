import type { Transaction } from './transaction.type'
import type { UTxOObject } from './utxo.type'

// export type HydraHeadStatus  = 'Idle' | 'Initializing' | 'Open' | 'Closed' | 'FanoutPossible' | 'Final'
export enum HydraHeadStatus {
  Idle = 'Idle',
  Initializing = 'Initializing',
  Open = 'Open',
  Closed = 'Closed',
  FanoutPossible = 'FanoutPossible',
  Final = 'Final'
}

export enum HydraCommand {
  Init = 'Init',
  Abort = 'Abort',
  NewTx = 'NewTx',
  GetUTxO = 'GetUTxO',
  Recover = 'Recover',
  Decommit = 'Decommit',
  Close = 'Close',
  Contest = 'Contest',
  Fanout = 'Fanout'
}

type VKeyAddress = { vkey: string }

export enum HydraHeadTag {
  Unknown = 'Unknown',

  PeerConnected = 'PeerConnected',
  PeerDisconnected = 'PeerDisconnected',
  PeerHandshakeFailure = 'PeerHandshakeFailure',

  HeadIsInitializing = 'HeadIsInitializing',
  HeadIsOpen = 'HeadIsOpen',
  Committed = 'Committed',
  HeadIsClosed = 'HeadIsClosed',
  HeadIsContested = 'HeadIsContested',
  ReadyToFanout = 'ReadyToFanout',
  HeadIsAborted = 'HeadIsAborted',
  HeadIsFinalized = 'HeadIsFinalized',

  TxValid = 'TxValid',
  TxInvalid = 'TxInvalid',
  SnapshotConfirmed = 'SnapshotConfirmed',
  GetUTxOResponse = 'GetUTxOResponse',
  CommandFailed = 'CommandFailed',
  Greetings = 'Greetings',
  PostTxOnChainFailed = 'PostTxOnChainFailed',
  InvalidInput = 'InvalidInput',
  IgnoredHeadInitializing = 'IgnoredHeadInitializing',

  DecommitInvalid = 'DecommitInvalid',
  DecommitRequested = 'DecommitRequested',
  DecommitApproved = 'DecommitApproved',
  DecommitFinalized = 'DecommitFinalized',

  CommitRecorded = 'CommitRecorded',
  CommitApproved = 'CommitApproved',
  CommitFinalized = 'CommitFinalized',
  CommitRecovered = 'CommitRecovered',
  CommitIgnored = 'CommitIgnored'
}

export type BasePayload = {
  tag: HydraHeadTag
  timestamp: string
}

type Greetings = {
  tag: HydraHeadTag.Greetings
  me: {
    vkey: string
  }
  headStatus: HydraHeadStatus
  hydraHeadId: string
  snapshotUtxo: string
  timestamp: Date
  hydraNodeVersion: string
}

type PeerConnected = {
  tag: HydraHeadTag.PeerConnected
  peer: string
}

type PeerDisconnected = {
  tag: HydraHeadTag.PeerDisconnected
  peer: string
}

// TODO: update later
type PeerHandshakeFailure = {
  tag: HydraHeadTag.PeerHandshakeFailure
}

type HeadIsInitializing = {
  tag: HydraHeadTag.HeadIsInitializing
  headId: string
  seq: number
  parties: VKeyAddress[]
}

type Committed = {
  tag: HydraHeadTag.Committed
  seq: number
  parties: VKeyAddress[]
  utxo: UTxOObject
}

type HeadIsOpen = {
  tag: HydraHeadTag.HeadIsOpen
  seq: number
  headId: string
  utxo: UTxOObject
}

type HeadIsClosed = {
  tag: HydraHeadTag.HeadIsClosed
  seq: number
  headId: string
  snapshotNumber: number
  contestationDeadline: string
}

type HeadIsContested = {
  tag: HydraHeadTag.HeadIsContested
  seq: number
  headId: string
  snapshotNumber: number
  contestationDeadline: string
}

type ReadyToFanout = {
  tag: HydraHeadTag.ReadyToFanout
  seq: number
  headId: string
}

type HeadIsAborted = {
  tag: HydraHeadTag.HeadIsAborted
  seq: number
  headId: string
  utxo: UTxOObject
}

type HeadIsFinalized = {
  tag: HydraHeadTag.HeadIsFinalized
  seq: number
  headId: string
  utxo: UTxOObject
}

type TxValid = {
  tag: HydraHeadTag.TxValid
  seq: number
  headId: string
  transactionId: string
  transaction: Transaction
}

type TxInvalid = {
  tag: HydraHeadTag.TxInvalid
  seq: number
  headId: string

  utxo: UTxOObject
  transaction: Transaction

  validationError: {
    reason: string
  }
}

type SnapshotConfirmed = {
  tag: HydraHeadTag.SnapshotConfirmed
  seq: number
  headId: string

  snapshot: {
    headId: string
    version: number
    number: number
    confirmed: Transaction[]
    utxo: UTxOObject
    utxoToCommit: UTxOObject
    utxoToDecommit: UTxOObject
  }
}

type GetUTxOResponse = {
  tag: HydraHeadTag.GetUTxOResponse
  seq: number
  headId: string

  utxo: UTxOObject
}

type InvalidInput = {
  tag: HydraHeadTag.InvalidInput
  seq: number
  reason: string
  input: string
}

type PostTxOnChainFailed = {
  tag: HydraHeadTag.PostTxOnChainFailed
  seq: number

  postTxError: {
    tag: 'ScriptFailedInWallet'
    redeemerPtr: string
    failureReason: string
  }

  postChainTx: {
    tag: 'InitTx'
    participants: string[]
    headParameters: {
      contestationPeriod: number
      parties: VKeyAddress[]
    }
  }
}

type CommandFailed = {
  tag: HydraHeadTag.CommandFailed
  seq: number

  clientInput: {
    tag: HydraCommand
  }
}

type IgnoredHeadInitializing = {
  tag: HydraHeadTag.IgnoredHeadInitializing
  seq: number

  headId: string
  contestationPeriod: number
  parties: VKeyAddress[]
  participants: string[]
}

type DecommitInvalid = {
  tag: HydraHeadTag.DecommitInvalid
  seq: number

  headId: string
  decommitTx: Transaction
  decommitInvalidReason: {
    tag: 'DecommitTxInvalid'
    localUTxO: UTxOObject
    validationError: {
      reason: string
    }
  }
}

type DecommitRequested = {
  tag: HydraHeadTag.DecommitRequested
  seq: number

  headId: string
  decommitTx: Transaction
  utxoToDecommit: UTxOObject
}

type DecommitApproved = {
  tag: HydraHeadTag.DecommitApproved
  seq: number

  headId: string
  decommitTxId: string
  utxoToDecommit: UTxOObject
}

type DecommitFinalized = {
  tag: HydraHeadTag.DecommitFinalized
  seq: number

  headId: string
  decommitTxId: string
}

type CommitRecorded = {
  tag: HydraHeadTag.CommitRecorded
  seq: number

  headId: string
  utxoToCommit: UTxOObject
  pendingDeposit: string
  deadline: string
}

type CommitApproved = {
  tag: HydraHeadTag.CommitApproved
  seq: number

  headId: string
  utxoToCommit: UTxOObject
}

type CommitFinalized = {
  tag: HydraHeadTag.CommitFinalized
  seq: number

  headId: string
  theDeposit: string
}

type CommitRecovered = {
  tag: HydraHeadTag.CommitRecovered
  seq: number

  headId: string
  recoveredUTxO: UTxOObject
  recoveredTxId: string
}

type CommitIgnored = {
  tag: HydraHeadTag.CommitIgnored
  seq: number

  headId: string
  depositUTxO: UTxOObject
  snapshotUTxO: UTxOObject
}

export type HydraPayload = Readonly<
  BasePayload &
    (
      | Greetings
      | PeerConnected
      | PeerDisconnected
      | PeerHandshakeFailure
      | HeadIsInitializing
      | Committed
      | HeadIsOpen
      | HeadIsClosed
      | HeadIsContested
      | HeadIsAborted
      | ReadyToFanout
      | HeadIsFinalized
      | TxValid
      | TxInvalid
      | SnapshotConfirmed
      | GetUTxOResponse
      | InvalidInput
      | PostTxOnChainFailed
      | CommandFailed
      | IgnoredHeadInitializing
      | DecommitInvalid
      | DecommitRequested
      | DecommitApproved
      | DecommitFinalized
      | CommitRecorded
      | CommitApproved
      | CommitFinalized
      | CommitRecovered
      | CommitIgnored
    )
>
