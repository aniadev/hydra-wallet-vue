import { defineStore } from 'pinia'
import { Message, Round, RoundResult, type GamePlayer, type Room, type User } from '../types'
import getRepository, { RepoName } from '@/repositories'
import type { HydraGameRepository } from '@/repositories/game'
import { GameSocketClient } from '../utils/game-socket-client'
import { useGameAuthStore } from '../../stores/gameAuthStore'

export const useGameRPSStore = defineStore('game-rps-store-v2', () => {
  // Repositories import
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository
  const gameAuthStore = useGameAuthStore()
  const $router = useRouter()

  // Lifecycle
  onBeforeUnmount(() => {
    //
  })
  onUnmounted(() => {
    //
  })
  onMounted(() => {
    //
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
        gameSocketClient.setAuth(gameAuthStore.gameAccessToken)
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
      gameSocketClient.socket.on('message', (message: any) => {
        console.log('[🛜][GameSocketClient]: message', message)
        if (message === 'UNAUTHORIZED') {
          gameAuthStore.setAccountLogout()
          $router.push({ name: 'Games' })
          return
        }
      })
      gameSocketClient.socket.on('online_users', (users: User[]) => {
        onlineUsers.value = users
      })
      gameSocketClient.socket.on('room_action', (payload: any) => {
        console.log('[🛜][GameSocketClient]: room_action', payload)
        const { status, action, data } = payload
        if (status === 'success' && (action === 'JOIN' || action === 'LEAVE')) {
          currentUsers.value = payload.data?.users || []
          userA.value =
            currentUsers.value.find(user => user.walletAddress === gameAuthStore.gameAccount?.walletAddress) || null
          userB.value =
            currentUsers.value.find(user => user.walletAddress !== gameAuthStore.gameAccount?.walletAddress) || null
        }
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
  /**
   * @description Current users in room
   */
  const currentUsers = ref<User[]>([])
  const userA = ref<User | null>(null)
  const userB = ref<User | null>(null)

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
  const resetPlayerChoice = (player: GamePlayer) => {
    player.choice = null
    player.commit = null
    player.reveal = null
    player.payout = null
    player.isReady = false
  }

  // Game History
  const isShowPopupHistory = ref(false)
  const gameHistory = ref<Round[]>([])

  // messages
  const messages = ref<Message[]>([])

  // popup Exit
  const isShowPopupExit = ref(false)
  const loadingExit = ref(false)

  // popup Invite
  const isShowPopupInvite = ref(false)
  const onlineUsers = ref<User[]>([])

  return {
    init,
    gameSocketClient,

    // Rooms
    rooms,
    currentRoom,
    currentUsers,
    userA,
    userB,
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
    resetPlayerChoice,

    // game history
    isShowPopupHistory,
    gameHistory,

    // messages
    messages,

    // popup Exit
    isShowPopupExit,
    loadingExit,

    // popup Invite
    isShowPopupInvite,
    onlineUsers
  }
})
