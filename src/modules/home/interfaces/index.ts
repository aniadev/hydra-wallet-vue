export abstract class WalletAssetConstructor {
  assetName!: string
  fingerprint!: string
  policyId!: string
}
export class WalletAsset extends WalletAssetConstructor {
  private walletId: string
  policyName: string | null
  metadata: string | null
  quantity: number | null
  image: string = ''
  status: 'fetching' | 'fetched' | 'error' = 'fetching'
  constructor(data: WalletAssetConstructor & Partial<WalletAsset>, walletId: string) {
    super()
    this.assetName = data.assetName
    this.fingerprint = data.fingerprint
    this.policyId = data.policyId
    this.policyName = data.policyName || null
    this.metadata = data.metadata || null
    this.quantity = data.quantity || null
    this.walletId = walletId
  }
  get meta() {
    if (!this.metadata) {
      return null
    }
    try {
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
      return (Object.values(_metaObjValue)[0] as AssetMetadata) || null
    } catch (e) {
      return null
    }
  }
  get isNFT() {
    return this.meta?.tokenTye === 'nft'
  }
  async fetchDetail() {
    try {
      this.status = 'fetching'
      const walletApi = useWalletApi()
      const rs = await walletApi.getAssetDetail(this.walletId, {
        policyId: this.policyId,
        assetName: this.assetName
      })
      if (rs.length && rs[0]) {
        const detail = rs[0]
        this.metadata = detail.metadata
        this.quantity = detail.quantity
        this.policyName = detail.policyName
        await this.getImageSource()
        this.status = 'fetched'
      }
    } catch (err) {
      console.error('Fail to fetch asset detail', err)
      this.status = 'error'
    }
  }
  get imageHash() {
    if (!this.meta?.image) {
      return null
    }
    return this.meta.image
  }
  async getImageSource() {
    if (!this.imageHash) {
      console.error('Missing image hash')
      return null
    }
    const blockfrostApiKey = import.meta.env.VITE_APP_BLOCKFROST_IPFS_API_KEY
    if (!blockfrostApiKey) {
      console.error('Missing VITE_APP_BLOCKFROST_IPFS_API_KEY')
      return null
    }
    const hash = this.imageHash.replace('ipfs://', '')
    const url = `https://ipfs.blockfrost.io/api/v0/ipfs/gateway/${hash}`
    const xhr = new XMLHttpRequest()

    const fetchImage = () =>
      new Promise<string>((resolve, reject) => {
        // Set up the request as a GET and specify the response type as 'blob' for binary data.
        xhr.open('GET', url, true)
        xhr.responseType = 'blob'
        xhr.setRequestHeader('Project_id', blockfrostApiKey) //
        // Define what happens on a successful data fetch
        xhr.onload = function () {
          if (xhr.status === 200) {
            // Convert the blob to an object URL
            const imageBlob = xhr.response
            const imageUrl = URL.createObjectURL(imageBlob)
            resolve(imageUrl)
          } else {
            console.error('Error fetching image:', xhr.statusText)
            reject(xhr.statusText)
          }
        }
        // Define what happens in case of an error
        xhr.onerror = function () {
          console.error('Request failed')
          reject('Request failed')
        }
        // Send the request
        xhr.send()
      })
    this.image = await fetchImage()
  }
}
