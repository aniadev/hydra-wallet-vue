export interface IWalletAsset {
  assetName: string
  fingerprint: string
  policyId: string
}

export abstract class WalletAssetConstructor implements IWalletAsset {
  assetName!: string
  fingerprint!: string
  policyId!: string
}
export class WalletAsset extends WalletAssetConstructor {
  metadata: string | null
  quantity: number | null
  status: 'fetching' | 'fetched' | 'error' = 'fetching'

  assetMeta = ref<any>(null)

  constructor(data: WalletAssetConstructor & Partial<WalletAsset>) {
    super()
    this.assetName = data.assetName
    this.fingerprint = data.fingerprint
    this.policyId = data.policyId
    this.metadata = data.metadata || null
    this.quantity = data.quantity || null
    this.fetchDetail()
  }
  isNFT = computed(() => {
    return this.assetMeta.value?.tokenTye === 'nft'
  })
  imageHash = computed<string>(() => {
    return this.assetMeta.value?.image || ''
  })
  async fetchDetail() {
    type AssetMetadata = {
      name?: string
      symbol?: string
      image: string
      description: string
      totalSupply: string
      minting: {
        type: string
        blockchain: string
        mintedBeforeSlotNumber: number
      }
      tokenTye?: string
      authors?: string
    }
    try {
      this.status = 'fetching'
      const walletApi = useWalletApi()
      //
      // fetch asset metadata
      const rs = await walletApi.getAssetDetail({
        policyId: this.policyId,
        assetName: this.assetName
      })
      if (rs.length && rs[0]) {
        const detail = rs[0]
        this.metadata = detail.metadata
        this.status = 'fetched'

        if (!this.metadata) {
          return null
        }
        /**
         * Example:
         * ```json
         * {
         *   "version": "1.0",
         *   "ddf722675e2604290ebc488f5a292b09d0384800883b68bd40460bdf": {
         *     "tHAI": {
         *       "name": "Hai token",
         *       "files": [
         *         {
         *           "src": "ipfs://QmUUJJyNdu5ngCj7KdF7X7f5qwtmjckaLLCtvSRDvNffbD",
         *           "name": "tHAI",
         *           "mediaType": "image/jpeg"
         *         }
         *       ],
         *       "image": "ipfs://QmUUJJyNdu5ngCj7KdF7X7f5qwtmjckaLLCtvSRDvNffbD",
         *       "symbol": "tHAI",
         *       "minting": {
         *         "type": "time-lock-policy",
         *         "blockchain": "cardano",
         *         "mintedBeforeSlotNumber": 68063963
         *       },
         *       "mediaType": "image/jpeg",
         *       "description": "haipham@DESKTOP",
         *       "totalSupply": "9999999",
         *        // for NFT
         *       "tokenTye": "nft",
         *       "authors": "Hdev1",
         *       "symbol": "TienAnhNFT-01",
         *     }
         *   }
         * }
         * ```
         */
        const _metaObj = JSON.parse(this.metadata)
        const _metaObjValue = Object.values(_metaObj)[1] as Record<string, any>

        this.assetMeta.value = (Object.values(_metaObjValue)[0] as AssetMetadata) || null
      }
    } catch (err) {
      console.error('Fail to fetch asset detail', err)
      this.status = 'error'
    }
  }
}
