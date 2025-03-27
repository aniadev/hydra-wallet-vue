/* eslint-disable @typescript-eslint/no-require-imports */

const { BlockfrostProvider, MeshWallet } = require('@meshsdk/core')

const main = async () => {
  const blockchainProvider = new BlockfrostProvider('preprodP1y4jQEKTV5a7eGoGGgr6cCGhOkEcmFw')
  const wallet = new MeshWallet({
    networkId: 0, // 0: testnet, 1: mainnet
    // fetcher: blockchainProvider,
    // submitter: blockchainProvider,
    key: {
      type: 'root',
      bech32:
        'xprv1epj5j8874exkwxpjn2qn7d2cfqhnq2yff7vkgydj08z86tuv030krvpjq44834ze7fxtv7ltw0s0j2vct7h4d8dlw28gyfgk7jq4cfms285zeh7hmezx9zsgcf7zulvzxwwnws6kr47mw8uysyw7t72cm5yae0ky'
    }
  })

  const balance = await wallet.getUsedAddress()
  console.log('>>> / balance:', balance)
}
main()
