import type { TxHash } from '@/lib/hydra-bridge/types/utxo.type'

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
  m_o: string
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
