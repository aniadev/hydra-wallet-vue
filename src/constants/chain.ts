type ChainType = 'preprod' | 'mainnet'

export const CHAIN: ChainType = 'preprod'
export const networkInfo = {
  networkId: CardanoWasm.NetworkInfo.testnet_preprod().network_id(),
  decimals: 6,
  name: 'tADA',
  symbol: 't₳'
}
