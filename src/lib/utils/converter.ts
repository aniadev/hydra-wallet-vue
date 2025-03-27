import { Serialization } from '@cardano-sdk/core'
import type { Asset, UTxO } from '../common/interfaces'
import {
  Address,
  AssetId,
  Datum,
  TransactionInput,
  TransactionOutput,
  TransactionUnspentOutput,
  Value,
  type TokenMap
} from '../types'
import { deserializeDataHash, deserializePlutusData, deserializeScriptRef, deserializeTxHash } from './deserializer'

export const toAddress = (bech32: string): Address => Address.fromBech32(bech32)

export const toTxUnspentOutput = (utxo: UTxO) => {
  const txInput = new TransactionInput(deserializeTxHash(utxo.input.txHash), BigInt(utxo.input.outputIndex))

  const txOutput = new TransactionOutput(toAddress(utxo.output.address), toValue(utxo.output.amount))

  if (utxo.output.dataHash !== undefined) {
    txOutput.setDatum(Datum.fromCore(deserializeDataHash(utxo.output.dataHash)))
  }

  if (utxo.output.plutusData !== undefined) {
    const plutusData = deserializePlutusData(utxo.output.plutusData)
    const datum = new Serialization.Datum(undefined, plutusData)
    txOutput.setDatum(datum)
  }

  if (utxo.output.scriptRef !== undefined) {
    txOutput.setScriptRef(deserializeScriptRef(utxo.output.scriptRef))
  }

  return new TransactionUnspentOutput(txInput, txOutput)
}

export const toValue = (assets: Asset[]) => {
  const multiAsset: TokenMap = new Map()
  assets
    .filter(asset => asset.unit !== 'lovelace')
    .forEach(asset => {
      multiAsset.set(AssetId(asset.unit), BigInt(asset.quantity))
    })

  const lovelace = assets.find(asset => asset.unit === 'lovelace')
  const value = new Value(BigInt(lovelace ? lovelace.quantity : 0))

  if (assets.length > 1 || !lovelace) {
    value.setMultiasset(multiAsset)
  }

  return value
}
