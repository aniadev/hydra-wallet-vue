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

export function snapshotUtxoToArray(snapshotUtxo: UTxOObject) {
  const txIds = Object.keys(snapshotUtxo) as TxHash[]
  return txIds.map(txId => {
    const [txHash, txIndex] = txId.split('#')
    const utxo = snapshotUtxo[txId]
    return {
      input: {
        transaction_id: txHash,
        index: Number(txIndex)
      },
      output: {
        address: utxo.address,
        amount: {
          coin: String(utxo.value.lovelace),
          multiasset: null
        },
        plutus_data: null,
        script_ref: null
      }
    }
  })
}
