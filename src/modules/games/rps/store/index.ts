import getRepository, { RepoName } from '@/repositories'
import type { HydraGameRepository } from '@/repositories/game'
import { defineStore } from 'pinia'
import { Message, type Room } from '../types'
import { Event, HexcoreSocketClient } from '../utils/socket-client'
import Cookies from 'js-cookie'
import { message } from 'ant-design-vue'
import { HydraBridge } from '@/lib/hydra-bridge'
import {
  HydraCommand,
  HydraHeadStatus,
  HydraHeadTag,
  type Committed,
  type HydraPayload
} from '@/lib/hydra-bridge/types/payload.type'
import { ChoiceType, Round, RoundResult, RoundStatus, type RevealDatum } from '../types/game.type'
import type { TxHash } from '@/lib/hydra-bridge/types/utxo.type'

export const useGameRPSStore = defineStore('game-rps-store', () => {
  const rooms = ref<Room[]>([])
  const currentRoom = ref<Room | null>(null)
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository
  const socketClient = ref<HexcoreSocketClient | null>(null)
  const socketConnected = ref(false)
  const messages = ref<Message[]>([])
  const gameHistory = ref<Round[]>([])

  const hydraBridge = ref<HydraBridge | null>(null)
  const round = reactive<Round>(new Round(3000000))

  function init() {
    socketClient.value = new HexcoreSocketClient({
      url: 'wss://hexcore.hdev99.io.vn/hydra-game',
      token: Cookies.get('token') || ''
    })
    socketClient.value.events.on(Event.CONNECTED, () => {
      socketConnected.value = true
      message.success('Connected to server')
    })

    socketClient.value.events.on(Event.DISCONNECTED, () => {
      socketConnected.value = false
      message.warn('Disconnected from server')
    })
  }

  function cleanUp() {
    socketClient.value?.cleanUp()
    destroyBridge()
    currentRoom.value = null
    gameHistory.value = []

    round.myChoice = ''
    round.myEncryptedChoice = ''
    round.myCommitTx = ''
    round.myRevealTx = ''
    round.myKey = ''
    round.enemyChoice = ''
    round.enemyEncryptedChoice = ''
    round.enemyCommitTx = ''
    round.enemyRevealTx = ''
    round.enemyKey = ''
    round.status = RoundStatus.IDLE
    round.result = RoundResult.UNKNOWN
    round.myRevealDatum = null
    round.enemyRevealDatum = null
  }

  const fetchRooms = async () => {
    try {
      const rs = await hydraGameApi.getGameRooms()
      rooms.value = rs.data.map(item => ({
        id: item.id,
        name: item.name,
        isOnline: item.status === 'ACTIVE',
        betAmount: 5000000,
        players: [],
        maxPlayers: item.party.nodes,
        party: item.gameRoomDetails.map(p => ({
          id: p.id,
          port: p.port
        }))
      }))
    } catch (error: any) {
      console.error(error)
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

  const setCurrentRoom = async (room: Room) => {
    const roomDetail = await fetchRoomDetail(room.id)
    if (!roomDetail) {
      message.error('Error when fetching room detail')
      return
    }
    // check room is full
    if (roomDetail.gameRoomDetails.length >= room.maxPlayers) {
      message.error('Room is full')
      return
    }
    // check free port
    console.log(roomDetail, room.party)
    const freeNode = roomDetail.party.hydraNodes.find(p => !roomDetail.gameRoomDetails.some(d => d.port === p.port))
    if (!freeNode) {
      message.error('No free port')
      return
    }
    // Request hexcore to join node
    const hydraNode = await socketClient.value?.joinRoom(room.id, freeNode.port)
    if (!hydraNode) {
      console.error('Error when joining room', hydraNode)
      message.error('Error when joining room')
      return
    }
    hydraBridge.value = new HydraBridge({
      host: `hydranode-${hydraNode.port}.hdev99.io.vn`, // ws://hydranode-10002.hdev99.io.vn,
      port: 443,
      protocol: 'wss',
      noHistory: true,
      noSnapshotUtxo: true
    })

    const bridge = hydraBridge.value
    bridge.connect()
    bridge.onError((e, ws) => {
      if (ws?.readyState === ws?.CLOSED) {
        message.error('Connection closed')
      }
    })

    bridge.events.on('onOpen', () => {
      addMessage(`Connected to Hydra Node`, 'BOT')
    })

    bridge.events.on('onMessage', payload => {
      if (payload.tag === HydraHeadTag.Greetings) {
        handleGreetings(payload)
      } else if (payload.tag === HydraHeadTag.HeadIsOpen) {
        console.log('[📣 HydraBridge] Head is Open')
        handleHeadOpen(payload)
      } else if (payload.tag === HydraHeadTag.ReadyToFanout) {
        console.log('[📣 HydraBridge] Ready to Fanout')
        bridge.sendCommand({
          command: HydraCommand.Fanout,
          afterSendCb() {
            console.log('[📣 HydraBridge] Send command Fanout')
          }
        })
      } else if (payload.tag === HydraHeadTag.HeadIsClosed) {
        console.log('[📣 HydraBridge] Head is Closed')
        addMessage(`Head is closed, preparing to quit this game!`, 'BOT')
      } else if (payload.tag === HydraHeadTag.HeadIsFinalized) {
        console.log('[📣 HydraBridge] Head Is Finalized')
      } else if (payload.tag === HydraHeadTag.Committed) {
        console.log('[📣 HydraBridge] Committed')
        handleCommitted(payload)
      } else {
        // console.log('>>> / Not Found handler')
      }
    })

    currentRoom.value = room
  }

  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  const destroyBridge = () => {
    try {
      const hydraBridge = getBridge()
      hydraBridge.disconnect()
      hydraBridge.events.all.clear()
    } catch (e) {
      console.error('>>> / onBeforeUnmount', e)
    }
  }

  function handleHeadOpen(payload: HydraPayload) {
    console.log('handleHeadOpen', payload)
  }

  function handleGreetings(payload: HydraPayload) {
    console.log('[📣 HydraBridge] handleGreetings', payload)
    if (payload.tag !== HydraHeadTag.Greetings) return
    const bridge = getBridge()
    if (payload.headStatus === HydraHeadStatus.Final) {
      // Send init command
      bridge.commands.init()
    } else if (payload.headStatus === HydraHeadStatus.Initializing) {
      console.log('[📣 HydraBridge] Hydra head is Initializing')
      addMessage(`Hydra head Initializing, ID: "${payload.hydraHeadId}", vkey: "${payload.me.vkey}"`, 'BOT')
    } else if (payload.headStatus === HydraHeadStatus.Open) {
      console.log('[📣 HydraBridge] Hydra head is opened')
    } else if (payload.headStatus === HydraHeadStatus.Idle) {
      bridge.sendCommand({
        command: HydraCommand.Init,
        afterSendCb() {
          console.log('[📣 HydraBridge] Send command Init')
        }
      })
    } else if (payload.headStatus === HydraHeadStatus.FanoutPossible) {
      bridge.sendCommand({
        command: HydraCommand.Fanout,
        afterSendCb() {
          console.log('[📣 HydraBridge] Send command Fanout')
        }
      })
    } else {
      console.log('>>> / Not Final')
    }
  }

  function handleCommitted(payload: Readonly<Committed>) {
    if (payload.party.vkey === hydraBridge.value?.vkey) {
      addMessage(`You committed to open hydra`, 'BOT')
    } else {
      addMessage(`Opponent committed to open hydra`, 'BOT')
    }
  }

  function addMessage(content: string, type: 'BOT' | 'USER' = 'BOT') {
    const message = new Message({ content, type })
    messages.value.push(message)
  }

  // ========================
  // Popups
  const isShowPopupExit = ref(false)
  const isShowPopupHistory = ref(false)

  return {
    rooms,
    fetchRooms,
    fetchRoomDetail,
    setCurrentRoom,
    currentRoom,
    hydraGameApi,
    init,
    cleanUp,
    socketClient,
    hydraBridge,
    messages,
    round,
    addMessage,
    isShowPopupExit,
    gameHistory,
    isShowPopupHistory
  }
})
