import { HydraState } from '@/modules/hydra/interfaces'
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

  SnapshotConfirmed = 'SnapshotConfirmed',
  GetUTxOResponse = 'GetUTxOResponse',
  CommandFailed = 'CommandFailed',
  Greetings = 'Greetings'
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

  function initConnection() {
    console.log('useHydraCore::: initConnection')
    if (ws.value) {
      ws.value.close()
    }
    ws.value = new WebSocket('ws://hydra.aniadev.pro?history=no')
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
  }

  function closeConnection() {
    console.log('useHydraCore::: closeConnection')
    ws.value?.close()
    ws.value = null
    events.reset()
  }

  onBeforeUnmount(() => {
    closeConnection()
  })

  function handleEvent(data: any) {
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
  }

  function sendCommand(command: 'Init' | 'Abort' | 'Close' | 'GetUTxO' | 'Close' | 'Fanout') {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ tag: command }))
  }

  return {
    ws,
    events,
    tagEvents,
    EVENT_NAME,
    initConnection,
    closeConnection,
    //
    headStatus,
    sendCommand
  }
})
