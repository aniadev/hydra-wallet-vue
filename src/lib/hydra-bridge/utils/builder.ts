import {
  Address,
  AssetId,
  AssetName,
  PolicyId,
  TransactionId,
  TransactionInput,
  TransactionOutput,
  TransactionUnspentOutput,
  Value,
  type TokenMap
} from '@/lib/types'
import type { TxHash, UTxOObject } from '../types/utxo.type'

export function buildUrl({
  protocol = 'https',
  host,
  port,
  path = '',
  queryParams = {}
}: {
  protocol: string
  host: string
  port?: number | string
  path?: string
  queryParams?: Record<string, string>
}) {
  const url = new URL(`${protocol}://${host}`)

  if (port) {
    url.port = `${port}`
  }

  if (path) {
    url.pathname = path.startsWith('/') ? path : `/${path}`
  }

  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  return url.toString()
}

export function snapshotUtxoToArray(snapshotUtxo: UTxOObject): TransactionUnspentOutput[] {
  const txIds = Object.keys(snapshotUtxo) as TxHash[]

  return txIds.map(txId => {
    const [txHash, txIndex] = txId.split('#')
    const address = Address.fromString(snapshotUtxo[txId].address)
    if (!address) throw 'Invalid address'

    const rawMultiAssets = Object.entries(snapshotUtxo[txId].value).filter(
      ([policyId]) => policyId !== 'lovelace'
    ) as Array<[string, Record<string, number>]>
    const tokenMap: TokenMap = new Map()
    rawMultiAssets.forEach(rawMultiAsset => {
      const [policyId, assets] = rawMultiAsset
      Object.entries(assets).forEach(([assetName, quantity]) => {
        tokenMap.set(AssetId.fromParts(PolicyId(policyId), AssetName(assetName)), BigInt(quantity))
      })
    })
    const amount = new Value(BigInt(snapshotUtxo[txId].value.lovelace), tokenMap)
    const input = new TransactionInput(TransactionId(txHash), BigInt(txIndex))
    const output = new TransactionOutput(address, amount)
    const utxoConstr = new TransactionUnspentOutput(input, output)

    return utxoConstr
    // return {
    //   input: {
    //     transaction_id: txHash,
    //     index: Number(txIndex)
    //   },
    //   output: {
    //     address: utxo.address,
    //     amount: {
    //       coin: String(utxo.value.lovelace),
    //       multiasset: null
    //     },
    //     plutus_data: null,
    //     script_ref: null
    //   }
    // }
  })
}
