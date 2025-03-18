export type Room = {
  name: string
  isOnline: boolean
  betAmount: number
  players: unknown[]
  maxPlayers: number
}

export type PlayerInfo = {
  avatarUrl: string
  name: string
}
