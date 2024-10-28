export namespace WalletDto {
  export namespace RestoreWallet {
    type RequestContent = {
      name: string
      mnemonic_sentence: string[]
      passphrase: string
    }

    type ResponseContent = {
      id: string
      address_pool_gap: number
      balance: {
        available: {
          quantity: number
          unit: string
        }
        reward: {
          quantity: number
          unit: string
        }
        total: {
          quantity: number
          unit: string
        }
      }
      assets: {
        available: {
          policy_id: string
          asset_name: string
          quantity: number
        }[]
        total: {
          policy_id: string
          asset_name: string
          quantity: number
        }[]
      }
      delegation: any
      name: string
      passphrase: {
        last_updated_at: string
      }
      state: {
        status: string
      }
      tip: any
    }
  }

  export namespace DetailWallet {
    type RequestContent = null

    type ResponseContent = {
      id: string
      address_pool_gap: number
      balance: {
        available: {
          quantity: number
          unit: string
        }
        reward: {
          quantity: number
          unit: string
        }
        total: {
          quantity: number
          unit: string
        }
      }
      assets: {
        available: {
          policy_id: string
          asset_name: string
          quantity: number
        }[]
        total: {
          policy_id: string
          asset_name: string
          quantity: number
        }[]
      }
      delegation: any
      name: string
      passphrase: {
        last_updated_at: string
      }
      state: {
        status: string
      }
      tip: any
    }
  }

  export namespace WalletAddresses {
    type RequestContent = {
      state?: 'used' | 'unused'
    }

    type ResponseContent = {
      id: string
      state: 'used' | 'unused'
      derivationPath: string[]
    }[]
  }

  export namespace WalletAssets {
    type RequestContent = null

    type ResponseContent = {
      assetName: string
      fingerprint: string
      hexAssetName: string
      policy: string
      quantity: number
      metadata: string
    }[]
  }

  export namespace AssetDetail {
    type RequestContent = {
      policyId: string
      assetName: string
    }

    type ResponseContent = {
      assetName: string
      fingerprint: string
      hexAssetName: string
      policy: string
      quantity: number
      metadata: string
    }[]
  }
}
