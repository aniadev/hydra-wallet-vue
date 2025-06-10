import { io, type Socket } from 'socket.io-client'
import configs from '../constants/configs'
import { SOCKET_EMIT_EVENTS, SOCKET_LISTEN_EVENTS, type EmitMessageType, type ListenMessageType } from '../types'

export class GameSocketClient {
  private _socket: Socket
  constructor() {
    this._socket = io(configs.socketioWsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false
    })
  }

  get socket() {
    return this._socket as Socket
  }

  get EmitEvents() {
    return SOCKET_EMIT_EVENTS
  }
  get ListenEvents() {
    return SOCKET_LISTEN_EVENTS
  }

  emit<Ev extends keyof EmitMessageType>(emitEvent: Ev, data: EmitMessageType[typeof emitEvent]) {
    const event = this.EmitEvents[emitEvent]
    this._socket.emit(event, data)
  }

  listen<Ev extends keyof ListenMessageType>(
    listenEvent: Ev,
    callback: (data: ListenMessageType[typeof listenEvent]) => void
  ) {
    const event = this.ListenEvents[listenEvent] as string
    this._socket.on(event, callback)
  }

  removeListener<Ev extends keyof ListenMessageType>(
    listenEvent: Ev,
    callback: (data: ListenMessageType[typeof listenEvent]) => void
  ) {
    const event = this.ListenEvents[listenEvent] as string
    this._socket.off(event, callback)
  }

  removeAllListeners() {
    this._socket.removeAllListeners()
  }

  listenOnce<Ev extends keyof ListenMessageType>(
    listenEvent: Ev,
    callback: (data: ListenMessageType[typeof listenEvent]) => void
  ) {
    const event = this.ListenEvents[listenEvent] as string
    this._socket.once(event, callback)
  }

  setAuth(token: string) {
    this._socket.auth = { token }
  }

  connect() {
    this._socket.connect()
  }

  disconnect() {
    this._socket.disconnect()
  }

  get connected() {
    return this._socket.connected
  }
}
