import { defineStore } from 'pinia'
import { Message, Round, RoundResult, type GamePlayer, type Room } from '../types'
import getRepository, { RepoName } from '@/repositories'
import type { HydraGameRepository } from '@/repositories/game'
import { GameSocketClient } from '../utils/game-socket-client'

export const useGameRPSStore = defineStore('game-rps-store-v2', () => {
  // Repositories import
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository

  // Lifecycle
  onBeforeUnmount(() => {
    gameSocketClient.removeAllListeners()
  })
  onUnmounted(() => {
    //
  })
  onMounted(() => {
    init()
  })
  onActivated(() => {
    //
  })
  onDeactivated(() => {
    //
  })

  const gameSocketClient = new GameSocketClient()
  async function init() {
    try {
      //
      if (!gameSocketClient.connected) {
        gameSocketClient.setAuth(useLocalStorage('token', '').value)
        gameSocketClient.connect()
      }
      gameSocketClient.socket.on('connect', () => {
        networkConnected.value = true
        console.log('[🛜][GameSocketClient]: connected')
      })
      gameSocketClient.socket.on('disconnect', () => {
        networkConnected.value = false
        console.log('[🛜][GameSocketClient]: disconnected')
      })
    } catch (error) {
      console.error(error)
    }
  }

  // Rooms
  const rooms = reactive({
    isLoading: false,
    items: [] as Room[]
  })
  const currentRoom = ref<Room | null>(null)
  const socketRoom = useLocalStorage('socket-room', '')

  const fetchRooms = async () => {
    try {
      rooms.isLoading = true
      const rs = await hydraGameApi.getGameRooms()
      rooms.items = rs.data.items
    } catch (error: any) {
      console.error(error)
    } finally {
      rooms.isLoading = false
    }
  }

  const fetchRoomDetail = async (roomId: number) => {
    try {
      const rs = await hydraGameApi.getGameRoomDetail(roomId)
      return rs.data
    } catch (error: any) {
      console.error(error)
    }
  }

  // Network
  const networkConnected = ref(true)
  function setCurrentRoom(_room: Room | null, _socketRoom: string | null) {
    currentRoom.value = _room
    socketRoom.value = _socketRoom
  }

  // Game
  const showPopupResult = ref(false)
  const loadingConfirm = ref(false)
  const playerA = ref<GamePlayer>({
    id: '',
    name: '',
    choice: null,
    score: 0,
    commit: null,
    reveal: null,
    payout: null,
    isReady: false
  })

  const playerB = ref<GamePlayer>({
    id: '',
    name: '',
    choice: null,
    score: 0,
    commit: null,
    reveal: null,
    payout: null,
    isReady: false
  })
  const currentRound = ref<Round | null>(null)
  const roundResult = ref<RoundResult>(RoundResult.Draw)

  // Game History
  const isShowPopupHistory = ref(false)
  const gameHistory = ref<Round[]>([])

  // messages
  const messages = ref<Message[]>([])

  // popup Exit
  const isShowPopupExit = ref(false)
  const loadingExit = ref(false)

  return {
    init,
    gameSocketClient,

    // Rooms
    rooms,
    currentRoom,
    socketRoom,
    fetchRooms,
    fetchRoomDetail,
    setCurrentRoom,

    // network
    networkConnected,

    // game
    showPopupResult,
    loadingConfirm,
    playerA,
    playerB,
    currentRound,
    roundResult,

    // game history
    isShowPopupHistory,
    gameHistory,

    // messages
    messages,

    // popup Exit
    isShowPopupExit,
    loadingExit
  }
})
