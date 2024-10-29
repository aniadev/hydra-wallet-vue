interface Amount {
  quantity: number
  unit: string
}

interface Token {
  // Define token properties if needed, currently it's an empty array

  /**
   * Hex encoded asset name
   */
  assetName: string
  policyId: string
  quantity: number
}

interface Input {
  address: string
  amount: Amount
  assets: Token[] // Assuming tokens will have a structure if needed
  id: string
  index: number
}

interface Output {
  address: string
  amount: Amount
  assets: Token[]
}

interface InsertedAt {
  absoluteSlotNumber: number
  epochNumber: number
  height: {
    quantity: number
    unit: string
  }
  slotNumber: number
  time: string
}

interface ValidityInterval {
  invalidBefore: {
    quantity: number
    unit: string
  }
  invalidHereafter: {
    quantity: number
    unit: string
  }
}

interface ExpiresAt {
  absoluteSlotNumber: number
  epochNumber: number
  slotNumber: number
  time: string
}

export interface Transaction {
  amount: Amount
  burn: {
    tokens: Token[]
  }
  certificates: any[] // Define type if known
  collateral: any[] // Define type if known
  collateralOutputs: any[] // Define type if known
  depositReturned: Amount
  depositTaken: Amount
  depth: {
    quantity: number
    unit: string
  }
  direction: 'incoming' | 'outgoing'
  expiresAt: ExpiresAt
  extraSignatures: string[]
  fee: Amount
  id: string
  inputs: Input[]
  insertedAt: InsertedAt
  mint: {
    tokens: Token[]
  }
  outputs: Output[]
  scriptValidity: string
  status: string
  validityInterval: ValidityInterval
  withdrawals: any[] // Define type if known
  scriptIntegrity?: string
}
