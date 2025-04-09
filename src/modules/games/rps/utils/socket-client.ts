import { io, Socket } from 'socket.io-client'
import { EventEmitter } from 'events'

type ConnectedPayload = {
  unicastRoom: string
}
type MessagePayload = {}
type JoinRoomPayload = {
  status: 'success'
  data: {
    room: {
      id: number
      name: string
    }
    port: number
    party: {
      nodes: number
    }
  }
}
type SocketPayload = ConnectedPayload | MessagePayload | JoinRoomPayload

export enum Event {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

export enum SocketEmitEvent {
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room'
}

export class HexcoreSocketClient {
  private _socket: Socket
  private _unicastRoom: string = ''
  private _eventBus = new EventEmitter()

  constructor(options: { url: string; token: string }) {
    this._socket = io(options.url, {
      transports: ['websocket', 'polling'],
      auth: {
        token: `${options.token}`
      }
    })

    this._socket.on('connect', () => {
      console.log('connected')
      this._eventBus.emit(Event.CONNECTED)
    })

    this._socket.on('disconnect', () => {
      console.log('disconnected')
      this._eventBus.emit(Event.DISCONNECTED)
    })

    this._socket.on('connected', (payload: SocketPayload) => {
      if ('unicastRoom' in payload) {
        this._unicastRoom = payload.unicastRoom
      }
    })

    this._socket.on('message', (payload: SocketPayload) => {
      console.log('message', payload)
    })
  }

  async joinRoom(roomId: number, port: number) {
    return new Promise<{ host: string; port: number; protocol: string }>((resolve, reject) => {
      this._socket.emit(SocketEmitEvent.JOIN_ROOM, { roomId, port })
      this._socket.once(SocketEmitEvent.JOIN_ROOM, (payload: JoinRoomPayload) => {
        if (payload.status === 'success') {
          const port = payload.data.port
          resolve({
            protocol: 'ws',
            host: 'localhost',
            port: port
          })
        } else {
          console.log(payload)
          reject(new Error('Failed to join room'))
        }
      })
      setTimeout(() => {
        reject(new Error('Timeout'))
      }, 5000)
    })
  }

  async leaveRoom() {
    return new Promise<void>((resolve, reject) => {
      this._socket.emit(SocketEmitEvent.LEAVE_ROOM)
      this._socket.once(SocketEmitEvent.LEAVE_ROOM, () => {
        resolve()
      })
    })
  }

  get events() {
    return this._eventBus
  }

  public cleanUp() {
    this._socket.close()
  }
}
