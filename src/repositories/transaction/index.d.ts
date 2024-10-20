export namespace TransactionDto {
  export namespace EstimateFee {
    type RequestContent = {
      payments: Array<{
        address: string
        amount: {
          quantity: number
          unit: string
        }
        assets: Array<{
          policy_id: string
          asset_name: string
          quantity: number
        }>
      }>
      withdrawal?: null | 'self'
      metadata?: any
      time_to_live?: {
        quantity: number
        unit: string
      }
    }

    type ResponseContent = {
      estimated_min: {
        quantity: number
        unit: string
      }
      estimated_max: {
        quantity: number
        unit: string
      }
      minimum_coins: {
        quantity: number
        unit: string
      }[]
      deposit: {
        quantity: number
        unit: string
      }
    }
  }

  export namespace CreateTransaction {
    type RequestContent = {
      passphrase: string
      payments: Array<{
        address: string
        amount: {
          quantity: number
          unit: string
        }
        assets: Array<{
          policy_id: string
          asset_name: string
          quantity: number
        }>
      }>
      withdrawal?: null | 'self'
      metadata?: any
      time_to_live?: {
        quantity: number
        unit: string
      }
    }

    type ResponseContent = {
      id: string
      amount: {
        quantity: number
        unit: string
      }
      fee: {
        quantity: number
        unit: string
      }
      deposit_taken: {
        quantity: number
        unit: string
      }
      deposit_returned: {
        quantity: number
        unit: string
      }
      inserted_at: {
        absolute_slot_number: number
        slot_number: number
        epoch_number: number
        time: string
        height: {
          quantity: number
          unit: string
        }
      }
      expires_at: {
        absolute_slot_number: number
        epoch_number: number
        slot_number: number
        time: string
      }
      pending_since: {
        absolute_slot_number: number
        slot_number: number
        epoch_number: number
        time: string
        height: {
          quantity: number
          unit: string
        }
      }
      depth: {
        quantity: number
        unit: string
      }
      direction: string
      inputs: {
        address: string
        amount: {
          quantity: number
          unit: string
        }
        assets: {
          policy_id: string
          asset_name: string
          quantity: number
        }[]
        id: string
        index: number
      }[]
      outputs: {
        address: string
        amount: {
          quantity: number
          unit: string
        }
        assets: {
          policy_id: string
          asset_name: string
          quantity: number
        }[]
        id: string
        index: number
      }[]
      collateral: any[]
      collateral_outputs: any[]
      withdrawals: {
        stake_address: string
        amount: {
          quantity: number
          unit: string
        }
      }[]
      status: string
      metadata: any
      script_validity: string
      certificates: any[]
      mint: any
      burn: any
      validity_interval: any
      script_integrity: string[]
      extra_signatures: string[][]
    }
  }

  export namespace ListTransaction {
    type RequestContent = {
      /**
       * @description  ISO 8601 date-and-time format.
       * @example '2021-09-01T00:00:00Z'
       */
      start?: string
      /**
       * @description  ISO 8601 date-and-time format.
       * @example '2021-09-01T00:00:00Z'
       */
      end?: string
      /**
       * @default 'descending'
       */
      order?: 'ascending' | 'descending'
      maxCount?: number
    }

    type ResponseContent = Transaction[]

    type Transaction = {
      amount: Amount
      burn: {
        tokens: Token[]
      }
      certificates: any[] // Define type if known
      collateral: any[] // Define type if known
      collateral_outputs: any[] // Define type if known
      deposit_returned: Amount
      deposit_taken: Amount
      depth: {
        quantity: number
        unit: string
      }
      direction: string
      expires_at: ExpiresAt
      extra_signatures: string[]
      fee: Amount
      id: string
      inputs: Input[]
      inserted_at: InsertedAt
      mint: {
        tokens: Token[]
      }
      outputs: Output[]
      script_validity: string
      status: string
      validity_interval: ValidityInterval
      withdrawals: any[] // Define type if known
    }

    interface Amount {
      quantity: number
      unit: string
    }

    interface Token {
      // Define token properties if needed, currently it's an empty array
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
      absolute_slot_number: number
      epoch_number: number
      height: {
        quantity: number
        unit: string
      }
      slot_number: number
      time: string
    }

    interface ValidityInterval {
      invalid_before: {
        quantity: number
        unit: string
      }
      invalid_hereafter: {
        quantity: number
        unit: string
      }
    }

    interface ExpiresAt {
      absolute_slot_number: number
      epoch_number: number
      slot_number: number
      time: string
    }
  }

  export namespace ConstructTransaction {
    type RequestContent = {
      payments: Array<{
        address: string
        amount: {
          quantity: number
          unit: string
        }
        assets: Array<{
          policy_id: string
          asset_name: string
          quantity: number
        }>
      }>
      withdrawal?: null | 'self'
      metadata?: any
      encrypt_metadata?: any
      mint_burn?: any[]
      vote?: string
      delegations?: any[]
      validity_interval?: any
      reference_policy_script_template?: string
      /**
       * base16 or base64
       * @default 'base64'
       */
      encoding?: 'base16' | 'base64'
    }

    type ResponseContent = {
      transaction: string
      coin_selection: {
        inputs: any[]
        outputs: any[]
        change: any[]
        collateral: any[]
        withdrawals: any[]
        certificates: any[]
        deposits_taken: any[]
        deposits_returned: any[]
        metadata: string
      }
      fee: {
        quantity: number
        unit: string
      }
    }
  }

  export namespace SignTransaction {
    type RequestContent = {
      passphrase: string
      transaction: string
      encoding?: 'base16' | 'base64'
    }

    type ResponseContent = {
      transaction: string
    }
  }
}
