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
interface IAssetMetadata {
  version: string
  [policyId: string]:
    | {
        [assetName: string]: IPolicyAsset
      }
    | string
}

interface IPolicyAsset {
  name?: string
  files: {
    src: string
    name: string
    mediaType: string
  }[]
  image: string
  symbol?: string
  minting: {
    type: string
    blockchain: string
    mintedBeforeSlotNumber: number
  }
  mediaType: string
  description: string
  totalSupply: number
  tokenTye?: string
  authors?: string
}

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

  constructor(data: WalletAssetConstructor & Partial<WalletAsset>) {
    super()
    this.assetName = data.assetName
    this.fingerprint = data.fingerprint
    this.policyId = data.policyId
    this.metadata = data.metadata || null
    this.quantity = data.quantity || null
  }
  isNFT = computed(() => {
    return this.metadataObj?.tokenTye === 'nft'
  })

  imageHash = computed(() => {
    return this.metadataObj?.image || ''
  })

  get metadataObj(): IPolicyAsset | null {
    if (!this.metadata) {
      return null
    }
    const _metaObj = JSON.parse(this.metadata)
    const _metaObjValue = Object.values(_metaObj)[1] as Record<string, any>
    return Object.values(_metaObjValue)[0] as IPolicyAsset
  }
}
