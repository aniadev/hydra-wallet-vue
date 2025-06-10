import type { TxHash } from '@/lib/hydra-bridge/types/utxo.type'
import { Choice } from './choice.type'
import { AniError } from '@/utils/custom-error'

export enum RoundStatus {
  IDLE = 'IDLE',
  COMMIT = 'COMMIT',
  REVEAL = 'REVEAL',
  PAYOUT = 'PAYOUT',
  FINALIZED = 'FINALIZED'
}
export enum ChoiceType {
  ROCK = 'ROCK',
  PAPER = 'PAPER',
  SCISSORS = 'SCISSORS'
}

export type InlineDatum = CommitDatum | RevealDatum | PayoutDatum

export enum DatumState {
  COMMIT = 1,
  REVEAL = 2,
  PAYOUT = 3
}

export type CommitDatum = {
  /**
   * Thời gian tạo commit
   */
  t: number
  /**
   * giá trị đã chọn đã mã hóa
   * @example
   * ```ts
   * rsa_hashed('ROCK' + 'user_1_key')
   * ```
   */
  m: string
  /**
   * Loại datum
   */
  s: DatumState.COMMIT
}

export type RevealDatum = {
  /**
   * Thời gian tạo commit
   */
  t: number
  /**
   * giá trị đã chọn đã mã hóa
   * @example
   * ```ts
   * rsa_hashed('ROCK' + 'd755f0c640a16366')
   * ```
   */
  m: string
  /**
   * Loại datum
   */
  s: DatumState.REVEAL
  /**
   * Key dùng để mã hóa
   * @example
   * ```ts
   * const key = "d755f0c640a16366"
   * ```
   */
  k_o: string
  /**
   * @description Move Original: Giá trị đã chọn ban đầu
   * @example 'ROCK'
   */
  m_o: ChoiceType
  /**
   * @description Địa chỉ tới `utxo_commit` trước đó của chính mình (ref tx_id_1)
   */
  r_1: TxHash
  /**
   * @description Địa chỉ tới `utxo_commit` trước đó của đối thủ (ref tx_id_2)
   */
  r_2: TxHash
}

export type PayoutDatum = {
  /**
   * @description `tx_hash` của `utxo_reveal` trước đó
   */
  r: TxHash
  /**
   * Loại datum
   */
  s: DatumState.PAYOUT
}

// export enum RoundResult {
//   WIN = 'win',
//   LOSE = 'lose',
//   DRAW = 'draw',
//   UNKNOWN = ''
// }

// export interface IRound {
//   id: number | string
//   betAmount: number
//   status: RoundStatus
//   result: RoundResult
//   myAddress: string
//   myCommitTx: TxHash | ''
//   myRevealTx: TxHash | ''
//   myRevealDatum: RevealDatum | null
//   myPayoutTx: TxHash | ''
//   myChoice: ChoiceType | ''
//   myKey: string
//   myEncryptedChoice: string

//   enemyAddress: string
//   enemyCommitTx: TxHash | ''
//   enemyRevealTx: TxHash | ''
//   enemyRevealDatum: RevealDatum | null
//   enemyChoice: ChoiceType | ''
//   enemyKey: string
//   enemyEncryptedChoice: string
// }

// export class Round implements IRound {
//   id = this.createId()
//   betAmount = 0 // 3 ADA
//   status = RoundStatus.IDLE
//   result = RoundResult.UNKNOWN

//   myAddress = ''
//   myCommitTx: TxHash | '' = ''
//   myRevealTx: TxHash | '' = ''
//   myRevealDatum: RevealDatum | null = null
//   myPayoutTx: TxHash | '' = ''
//   myChoice: ChoiceType | '' = ''
//   myKey = ''
//   myEncryptedChoice = ''

//   enemyAddress = ''
//   enemyCommitTx: TxHash | '' = ''
//   enemyRevealTx: TxHash | '' = ''
//   enemyRevealDatum: RevealDatum | null = null
//   enemyChoice: ChoiceType | '' = ''
//   enemyKey = ''
//   enemyEncryptedChoice = ''

//   constructor(data?: Omit<IRound, 'betAmount'> | number) {
//     if (typeof data === 'number') {
//       this.betAmount = data
//     } else {
//       Object.assign(this, data)
//     }
//   }

//   createId() {
//     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
//       const r = (Math.random() * 16) | 0
//       const v = c === 'x' ? r : (r & 0x3) | 0x8
//       return v.toString(16)
//     })
//   }
// }

export enum RoundResult {
  Player1Wins = 'Player1Wins',
  Player2Wins = 'Player2Wins',
  Draw = 'Draw',
  Timeout = 'Timeout'
}
export class Round {
  id: string = Math.random().toString(36).substring(7)
  player1Choice: Choice | null = null
  player2Choice: Choice | null = null
  result: RoundResult | null = null

  constructor(public roundNumber: number) {}

  determineWinner(): void {
    if (!this.player1Choice || !this.player2Choice) {
      throw new AniError({
        status: 'fail',
        reason: 'PLAYER_NOT_REVEALED',
        message: 'Both player choices are required to determine winner'
      })
    }

    if (this.player1Choice === this.player2Choice) {
      this.result = RoundResult.Draw
    } else if (
      (this.player1Choice === Choice.Rock && this.player2Choice === Choice.Scissors) ||
      (this.player1Choice === Choice.Paper && this.player2Choice === Choice.Rock) ||
      (this.player1Choice === Choice.Scissors && this.player2Choice === Choice.Paper)
    ) {
      this.result = RoundResult.Player1Wins
    } else {
      this.result = RoundResult.Player2Wins
    }
  }
}

export enum GameState {
  WaitingForPlayers = 'WaitingForPlayers',
  WaitingForChoices = 'WaitingForChoices',
  CommittingChoices = 'CommittingChoices',
  RevealingChoices = 'RevealingChoices',
  WaitingForPayout = 'WaitingForPayout',
  ShowRoundResult = 'ShowRoundResult',
  WaitingForNextRound = 'WaitingForNextRound'
}

export type GamePlayer = {
  choice: null
  score: number
  commit: null
  reveal: null
  payout: null
  isReady: boolean
  id: string // wallet address
  name: string // username/alias
}

export type SocketGame = {
  state: GameState
  players: GamePlayer[]
  currentRound: unknown
  roundNumber: number
  maxPlayers: number
  history: unknown[]
  roundTimeoutMs: number
}
