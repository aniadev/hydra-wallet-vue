import { HydraState, type UtxoObjectValue } from '@/modules/hydra/interfaces'
import { message } from 'ant-design-vue'
import { defineStore } from 'pinia'

type HeadStatus = 'Idle' | 'Initializing' | 'Open' | 'Closed' | 'FanoutPossible' | 'Final'

// TODO: Add more types
export enum HeadTag {
  Unknown = 'Unknown',

  HeadIsInitializing = 'HeadIsInitializing',
  HeadIsOpen = 'HeadIsOpen',
  Committed = 'Committed',
  HeadIsClosed = 'HeadIsClosed',
  HeadIsContested = 'HeadIsContested',
  ReadyToFanout = 'ReadyToFanout',
  HeadIsAborted = 'HeadIsAborted',
  HeadIsFinalized = 'HeadIsFinalized',

  TxValid = 'TxValid',
  SnapshotConfirmed = 'SnapshotConfirmed',
  GetUTxOResponse = 'GetUTxOResponse',
  CommandFailed = 'CommandFailed',
  Greetings = 'Greetings',
  PostTxOnChainFailed = 'PostTxOnChainFailed'
}

type EventHeadStatus = {
  headStatus: HeadStatus
  hydraNodeVersion: string
  me: { vkey: string }
  seq: number
  snapshotUtxo: {
    [key: string]: UtxoObjectValue
  }
  tag: HeadTag
  timestamp: string
}

type HydraHead = {
  headId: string
  seq: number
  tag: HeadTag
  timestamp: string
  utxo: {
    [key: string]: UtxoObjectValue
  }
}

export const useHydraCore = defineStore('hydra-core', () => {
  const ws = ref<WebSocket | null>(null)
  const events = useEventBus('hydra-events')
  const tagEvents = useEventBus('hydra-tag-events')
  const EVENT_NAME = {
    HYDRA_STATE: 'hydra-state',
    HEAD_TAG: 'head-tag'
  }

  const headStatus = ref<HeadStatus>('Idle')
  const headTag = ref<HeadTag>(HeadTag.CommandFailed)
  const hydraHead = ref<HydraHead>({
    headId: '',
    seq: 0,
    tag: HeadTag.Unknown,
    timestamp: '',
    utxo: {}
  })

  function initConnection() {
    try {
      console.log('useHydraCore::: initConnection', ws.value)
      const route = useRoute()
      const endpoint = route.query.node_src === 'node1' ? 'node1.hydra.hdev99.io.vn' : 'node2.hydra.hdev99.io.vn'
      if (ws.value) {
        ws.value.close()
        ws.value = null
      }
      ws.value = new WebSocket(`wss://${endpoint}?history=no`)
      ws.value.onopen = () => {
        console.log('useHydraCore::: onopen')
        //
      }
      ws.value.onmessage = event => {
        //
        try {
          const data = JSON.parse(event.data)
          console.log('useHydraCore::: onmessage::: data', data)
          handleEvent(data)
        } catch (error) {
          console.error('useHydraCore::: onmessage::: data', event.data)
          console.error('useHydraCore::: onmessage::: error', error)
        }
      }
    } catch (error) {
      console.error('useHydraCore::: initConnection::: error', error)
    }
  }

  function closeConnection() {
    try {
      console.log('useHydraCore::: closeConnection')
      ws.value?.close()
      ws.value = null
      events.reset()
    } catch (error) {
      console.error('useHydraCore::: closeConnection::: error', error)
    }
  }

  onBeforeUnmount(() => {
    closeConnection()
  })

  function handleEvent(data: EventHeadStatus | HydraHead) {
    if ('headStatus' in data) {
      headStatus.value = data.headStatus || 'Idle'
      headTag.value = data.tag || HeadTag.Unknown
      tagEvents.emit(headTag.value, data)

      // Handle events
      if (headStatus.value === 'FanoutPossible') {
        sendCommand('Fanout')
      }

      if (headTag.value === HeadTag.HeadIsFinalized) {
        closeConnection()
        initConnection()
        message.success('Head is finalized. Close connection.')
      } else if (headTag.value === HeadTag.ReadyToFanout) {
        sendCommand('Fanout')
      }
    } else if ('headId' in data) {
      hydraHead.value = data
      headTag.value = data.tag || HeadTag.Unknown
      tagEvents.emit(headTag.value, data)

      if (headTag.value === HeadTag.ReadyToFanout) {
        sendCommand('Fanout')
      }
    }
  }

  function sendCommand(command: 'Init' | 'Abort' | 'Close' | 'GetUTxO' | 'Close' | 'Fanout') {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ tag: command }))
    message.info(`Command sent: ${command}`)
  }

  return {
    ws,
    events,
    tagEvents,
    EVENT_NAME,
    initConnection,
    closeConnection,
    //
    hydraHead,
    headStatus,
    sendCommand
  }
})
