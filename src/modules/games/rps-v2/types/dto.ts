export type UserDto = {
  id: number
  walletAddress: string
  alias: string
  avatar: string
  createdAt: string
}

export type CurrencyDto = {
  id: number
  name: string
  symbol: string
  decimals: number
  usdPrice: number
  assetName: string | null
  policyId: string | null
  createdAt: string
}

export type RoomDto = {
  id: number
  code: string
  requiredPassword: boolean
  customName: string
  betAmount: number
  betUnit: CurrencyDto
  maxPlayers: number
  withViewer: boolean
  isActive: boolean
  isPrivate: boolean
  createdBy: UserDto
  createdAt: string
}
