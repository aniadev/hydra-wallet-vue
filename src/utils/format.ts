import type { IAssetToken } from '@/interface/currency.type'
import { forEach } from 'lodash-es'

export const formatId = (id: string | null, begin = 5, last = 5): string => {
  if (!id) return ''
  if (id.length <= begin + last) return id
  const before = id.substring(0, begin)
  const after = id.substring(id.length - last)
  return before + '...' + after
}

export const createId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const ROUNDING_CURRENCY: Record<string, any> = {
  ADA: 6,
  lovelace: 1
}

const TOKEN_LIST_BNB: Record<string, any> = {}
const TOKEN_LIST_ETH: Record<string, any> = {}
export function initListToken(listToken: IAssetToken[], listAllToken: IAssetToken[]): void {
  forEach(listToken, token => {
    ROUNDING_CURRENCY[token.currency] = token.rounding
  })
  ROUNDING_CURRENCY['USD'] = 2
  ROUNDING_CURRENCY['PERCENT'] = 2

  forEach(listAllToken, token => {
    if (token.network === 'BEP20') {
      TOKEN_LIST_BNB[token.currency] = token.decimals
    } else {
      TOKEN_LIST_ETH[token.currency] = token.decimals
    }
  })
}

export function convertAmountDecimal(
  amount: string | number,
  currency: string,

  isRoundedDown = false,
  isAddNameCurrency = false
): string {
  if (!amount) {
    if (currency === 'PERCENT') {
      return '0'
    }
    amount = 0 // case amount = null | ''
    if (isAddNameCurrency) {
      return (
        amount.toLocaleString('en-US', {
          minimumFractionDigits: ROUNDING_CURRENCY[currency]
        }) +
        ' ' +
        currency
      )
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: ROUNDING_CURRENCY[currency]
    })
  }

  if (+amount >= 100 && currency === 'PERCENT') {
    return '100'
  }

  amount = amount.toString()
  if (amount.includes('.')) {
    if (isAddNameCurrency) {
      const number = +toFixedNumber(+amount, ROUNDING_CURRENCY[currency])
      return (
        number.toLocaleString('en-US', {
          minimumFractionDigits: ROUNDING_CURRENCY[currency]
        }) +
        ' ' +
        currency
      )
    }

    const number = +toFixedNumber(+amount, ROUNDING_CURRENCY[currency])
    return number.toLocaleString('en-US', {
      minimumFractionDigits: ROUNDING_CURRENCY[currency]
    })
  }
  const _value = +amount
  if (isAddNameCurrency) {
    return (
      _value.toLocaleString('en-US', {
        minimumFractionDigits: ROUNDING_CURRENCY[currency]
      }) +
      ' ' +
      currency
    )
  } else {
    return _value.toLocaleString('en-US', {
      minimumFractionDigits: ROUNDING_CURRENCY[currency]
    })
  }
}

export function toFixedNumber(number: number, precision: number): string {
  const shift = function (number: string | number, exponent: number) {
    const numArray = ('' + number).split('e')
    return +(numArray[0] + 'e' + (numArray[1] ? +numArray[1] + exponent : exponent))
  }
  return shift(Math.round(shift(number, +precision)), -precision) + ''
}

export function truncateToDecimals(num: number, dec: string): string {
  const calcDec = Math.pow(10, ROUNDING_CURRENCY[dec])
  return Number((Math.trunc(num * calcDec) / calcDec).toFixed(ROUNDING_CURRENCY[dec])).toLocaleString('en-US', {
    minimumFractionDigits: ROUNDING_CURRENCY[dec]
  })
}

export function recursiveToCamel<T extends Record<string, any>>(item: Record<string, any>): T {
  if (Array.isArray(item)) {
    return item.map((el: Record<string, any>) => recursiveToCamel(el)) as Record<string, any> as T
  } else if (typeof item === 'function' || item !== Object(item)) {
    return item as Record<string, any> as T
  }
  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(([key, value]: [string, unknown]) => [
      key.replace(/([_][a-z])/gi, c => c.toUpperCase().replace(/[_]/g, '')),
      recursiveToCamel(value as Record<string, any>)
    ])
  ) as Record<string, any> as T
}

export function convertKeysToSnakeCase<T extends Record<string, any>>(obj: Record<string, any>): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase) as Record<string, any> as T
  }

  return Object.keys(obj).reduce((acc, key) => {
    const snakeCaseKey = key.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)
    // @ts-ignore
    acc[snakeCaseKey] = convertKeysToSnakeCase(obj[key])
    return acc
  }, {}) as Record<string, any> as T
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}
