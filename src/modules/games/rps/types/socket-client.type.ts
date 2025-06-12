import { Choice } from './choice.type'
import type { GamePlayer, GameState, RoundResult, SocketGame } from './game.type'
import type { Room } from './room.type'
import type { User } from './user.type'

export const SOCKET_EMIT_EVENTS = {
  ROOM_ACTION: 'room_action',
  GAME: 'game',
  GAME_CHAT: 'game_chat',
  GAME_INVITE: 'game_invite'
}
export const SOCKET_LISTEN_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ROOM_ACTION: 'room_action',
  GAME: 'game',
  GAME_STATE_CHANGED: 'game_state_changed',
  MESSAGE: 'message',
  GAME_CHAT: 'game_chat',
  GAME_INVITE: 'game_invite'
}

// ============================================= EMITS =================================================================================

type GameMessageType = {
  gameRoomId: number
  socketRoom: string
} & (
  | {
      action: 'READY'
    }
  | {
      action: 'COMMIT'
      data: {
        encryptedChoice: string
        txId: string
      }
    }
  | {
      action: 'REVEAL'
      data: {
        choice: Choice
        salt: string
        txId: string
      }
    }
  | {
      /**
       * @deprecated
       */
      action: 'PAYOUT'
      data: {
        txId: string
      }
    }
  | {
      action: 'GET_STATE'
    }
)
export interface EmitMessageType extends Record<keyof typeof SOCKET_EMIT_EVENTS, any> {
  ROOM_ACTION:
    | {
        roomId: number
        action: 'JOIN'
        password?: string
      }
    | {
        roomId: number
        action: 'LEAVE'
        /**
         * Socket room: = `GAME.${roomId}`
         */
        socketRoom: string
      }
  GAME: GameMessageType
  GAME_CHAT: {
    gameRoomId: number
    socketRoom: string
    message: string
  }
  GAME_INVITE: {
    toAddress: string
    gameRoomId: number
    gameRoomCode: string
    message?: string
  }
}
// ============================================= EMITS =================================================================================

// ===========================================================================================================================================================

// ============================================= RESPONSE =================================================================================
export type BaseSocketResponseMessage<T> = {
  status: 'success' | 'error'
  message: string
  data: T
}

export type RoomActionResponse = BaseSocketResponseMessage<{
  socketRoom: string
  room: Room
  users: User[]
  game: SocketGame
  target: User
}> & { action: 'JOIN' | 'LEAVE' }

export type GameStateResponseMessage = BaseSocketResponseMessage<{
  game: SocketGame
}> & { action: 'GET_STATE' }

export type GameActionResponseMessage = BaseSocketResponseMessage<{
  game: SocketGame
}> & { action: 'READY' | 'COMMIT' | 'REVEAL' }

export type GameResponseMessage = GameStateResponseMessage | GameActionResponseMessage

export type GameStateChangedResponseMessage = BaseSocketResponseMessage<{
  state: GameState
  oldState: GameState
  players: GamePlayer[]
  currentRound: {
    roundNumber: number
    id: string
    player1Choice: Choice
    player2Choice: Choice
    result: RoundResult
  } | null
}>

export type GameChatResponseMessage = BaseSocketResponseMessage<{
  message: string
  from: User
  to: {
    room: Room['id']
    socketRoom: string
  }
  timestamp: string | number
}>

export type GameInviteResponseMessage = BaseSocketResponseMessage<{
  from: User
  to: User
  gameRoomId: Room['id']
  gameRoomCode: Room['code']
  message?: string
  timestamp: string | number
}>

// ============================================= RESPONSE =================================================================================

export interface ListenMessageType extends Record<keyof typeof SOCKET_LISTEN_EVENTS, any> {
  CONNECT: any
  DISCONNECT: any
  ROOM_ACTION: RoomActionResponse
  MESSAGE: any
  GAME: GameResponseMessage
  GAME_STATE_CHANGED: GameStateChangedResponseMessage
  GAME_CHAT: GameChatResponseMessage
  GAME_INVITE: GameInviteResponseMessage
}
