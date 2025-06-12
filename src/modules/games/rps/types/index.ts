import type { User } from './user.type'

export * from './game.type'
export * from './room.type'
export * from './user.type'
export * from './socket-client.type'

export class Message {
  private _type: 'BOT' | 'USER' = 'BOT'
  private _content: string = ''
  private _timestamp: string | number = ''
  private _id: string = Math.random().toString(36).substring(8)
  private _from: User | null = null

  constructor(args: { content: string; timestamp?: string | number; type?: 'BOT' | 'USER'; from?: User }) {
    this._type = args.type || 'BOT'
    this._content = args.content
    this._timestamp = args.timestamp || new Date().toISOString()
    this._from = args.from || null
  }
  get content() {
    return this._content
  }
  get type() {
    return this._type
  }
  get timestamp() {
    return this._timestamp
  }
  get id() {
    return this._id
  }
  get from() {
    return this._from
  }

  static fromBot(content: string) {
    return new Message({ content })
  }
  static fromUser(from: User, content: string, timestamp?: string | number) {
    return new Message({ content, type: 'USER', from, timestamp })
  }
}
