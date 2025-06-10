import BigNumber from 'bignumber.js'

import { CHAIN } from '../constants/chain'

export type Currency = {
  id: number
  name: string
  symbol: string
  decimals: number
  usdPrice: number
  assetName: string | null
  policyId: string | null
  createdAt?: string
  icon?: string
}

export class CurrencyBalance {
  chain = CHAIN
  constructor(
    public currency: Currency,
    public amount: number | string
  ) {
    this.currency = currency
    this.amount = amount
  }

  get valueInUsd() {
    return BigNumber(this.amount).multipliedBy(this.currency.usdPrice)
  }

  toAda(withSymbol = false) {
    let value = null
    if (this.currency.symbol === CHAIN.native) {
      value = BigNumber(this.amount).dividedBy(1_000_000)
    } else {
      value = BigNumber(this.amount).dividedBy(Math.pow(10, this.currency.decimals))
    }
    return withSymbol ? value.toFormat() + ' ' + CHAIN.symbol : value.toFormat()
  }
}
