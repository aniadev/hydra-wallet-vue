export const SOCKET_EVENT = {
  KEEP_ALIVE: 'keep_alive',
  ROOM_ACTION: 'room_action',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  MESSAGE: 'message',
  CONNECTED: 'connect',
  DISCONNECTED: 'disconnect',
  ONLINE_USERS: 'online_users',
  ROOM_UPDATED: 'room_updated',
  GAME: 'game',
  GAME_STATE_CHANGED: 'game_state_changed'
}

export const SOCKET_EMIT_EVENT = {
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_ACTION: 'room_action',
  ROOM_UPDATED: 'room_updated',
  GAME: 'game'
}
