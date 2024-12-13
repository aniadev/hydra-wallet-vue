import { defineStore } from 'pinia'
import type { UtxoObjectValue } from '../interfaces'
import { message } from 'ant-design-vue'
import { HeadTag } from '@/composables/useHydraCore'

type HeadStatus = 'Idle' | 'Initializing' | 'Open' | 'Closed' | 'FanoutPossible' | 'Final'

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

export const useRpsStore = defineStore('rps-store', () => {
  const ws = ref<WebSocket | null>(null)
  const headStatus = ref<HeadStatus>('Idle')
  const headTag = ref<HeadTag>(HeadTag.CommandFailed)
  const hydraHead = ref<HydraHead>({
    headId: '',
    seq: 0,
    tag: HeadTag.Unknown,
    timestamp: '',
    utxo: {}
  })
  const tagEvents = useEventBus('hydra-tag-events')

  function initConnection(node: string) {
    try {
      console.log('useHydraCore::: initConnection', ws.value)
      if (ws.value) {
        ws.value.close()
        ws.value = null
      }
      ws.value = new WebSocket(`${node}?history=no`)
      ws.value.onopen = () => {
        console.log('useHydraCore::: onopen')
        message.success('Connection opened.')
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
      tagEvents.reset()
      message.success('Connection closed.')
    } catch (error) {
      console.error('useHydraCore::: closeConnection::: error', error)
    }
  }

  function handleEvent(data: EventHeadStatus | HydraHead) {
    headTag.value = data.tag || HeadTag.Unknown
    message.info(`TAG: ${headTag.value}`)
    tagEvents.emit(headTag.value, data)
    if (headTag.value === HeadTag.Greetings) {
      headStatus.value = (data as EventHeadStatus).headStatus
      message.info(`Hydra node version: ${(data as EventHeadStatus).hydraNodeVersion}`)
    }

    // if ('headStatus' in data) {
    //   headStatus.value = data.headStatus || 'Idle'
    //   headTag.value = data.tag || HeadTag.Unknown
    //   tagEvents.emit(headTag.value, data)

    //   // Handle events
    //   if (headStatus.value === 'FanoutPossible') {
    //     sendCommand('Fanout')
    //   }

    //   if (headTag.value === HeadTag.HeadIsFinalized) {
    //     // closeConnection()
    //     // initConnection()
    //     message.success('Head is finalized. Close connection.')
    //   } else if (headTag.value === HeadTag.ReadyToFanout) {
    //     sendCommand('Fanout')
    //   }
    // } else if ('headId' in data) {
    //   hydraHead.value = data
    //   headTag.value = data.tag || HeadTag.Unknown
    //   tagEvents.emit(headTag.value, data)
    // }
  }

  function sendCommand(command: 'Init' | 'Abort' | 'Close' | 'GetUTxO' | 'Close' | 'Fanout') {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ tag: command }))
    message.info(`Command sent: ${command}`)
  }

  return {
    ws,
    initConnection,
    closeConnection,
    hydraHead,
    headStatus
  }
})
