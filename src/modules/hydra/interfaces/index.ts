export enum HydraState {
  UNKNOWN = 'UNKNOWN',
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  OPEN = 'OPEN',
  FINAL = 'FINAL',
  CLOSED = 'CLOSED',
  FANOUTPOSSIBLE = 'FANOUTPOSSIBLE'
}

export interface UtxoObject {
  [txId: string]: UtxoObjectValue
}

export interface UtxoObjectValue {
  address: string
  datum: null
  datumhash: null
  inlineDatum: null
  referenceScript: null
  value: {
    [policyId: string]:
      | {
          [assetName: string]: number
        }
      | any
    lovelace: number
  }
}
