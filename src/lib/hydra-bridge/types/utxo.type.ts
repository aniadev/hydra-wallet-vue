type Nullable<T> = T | null

type TxId = string
type TxIndex = string
export type TxHash = `${TxId}#${TxIndex}`
export type ReferenceScript = Nullable<{
  scriptLanguage: string
  script: {
    type: 'SimpleScript' | 'PlutusScriptV1' | 'PlutusScriptV2' | 'PlutusScriptV3'
    description: string
    cborHex: string
  }
}>

export type UTxOObject = Record<TxHash, UTxOObjectValue>

export type UTxOObjectValue = {
  address: string
  /**
   * `encoding: base16`
   */
  datum: Nullable<string>
  datumhash: Nullable<string>
  inlineDatum: Nullable<Record<string, any>>
  /**
   * The base16-encoding of the CBOR encoding of some binary data
   */
  inlineDatumRaw?: Nullable<string>
  /**
   * The base16-encoding of the CBOR encoding of some binary data
   */
  inlineDatumhash?: Nullable<string>
  referenceScript: ReferenceScript
  value: {
    lovelace: number
  } & Record<string, any>
}
