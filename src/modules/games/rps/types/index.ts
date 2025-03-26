export type Room = {
  id: number
  name: string
  isOnline: boolean
  betAmount: number
  players: unknown[]
  maxPlayers: number
  party: {
    id: number
    port: number
  }[]
}

export type PlayerInfo = {
  avatarUrl?: string | null
  name?: string | null
  address: string
}

export class Message {
  private _type: 'BOT' | 'USER' = 'BOT'
  private _content: string = ''
  private _createdAt: string = ''
  constructor(args: { content: string; createdAt?: string; type?: 'BOT' | 'USER' }) {
    this._type = args.type || 'BOT'
    this._content = args.content
    this._createdAt = args.createdAt || new Date().toISOString()
  }
  get content() {
    return this._content
  }
  get type() {
    return this._type
  }
  get createdAt() {
    return this._createdAt
  }
}
