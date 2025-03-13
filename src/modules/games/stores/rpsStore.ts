import { HydraBridge } from '@/lib/hydra-bridge'
import { HydraCommand, HydraHeadStatus, HydraHeadTag, type HydraPayload } from '@/lib/hydra-bridge/types/payload.type'
import { message } from 'ant-design-vue'
import { defineStore } from 'pinia'

export const useRpsStore = defineStore('rps-store', () => {
  const hydraBridge = ref<HydraBridge | null>(null)
  const route = useRoute()

  function initSocketConnection() {
    const host = route.query.host as string
    const port = route.query.port as string
    const partyId = route.query.partyId as string
    const headId = route.query.hydraHeadId as string
    if (!host || !port || !partyId || !headId) {
      console.error('PARAM is invalid')
      return
    }
    hydraBridge.value = new HydraBridge({
      host,
      port,
      protocol: 'wss',
      noHistory: true,
      noSnapshotUtxo: true
      // submitter: submitter
    })

    const bridge = hydraBridge.value
    bridge.connect()
    bridge.onError((e, ws) => {
      if (ws?.readyState === ws?.CLOSED) {
        message.error('Connection closed')
      }
    })
    // bridge.onMessage(payload => {
    //   console.log('>>> / payload:', payload)
    //   if (payload.tag === HydraHeadTag.Greetings) {
    //     handleGreetings(payload)
    //   } else if (payload.tag === HydraHeadTag.HeadIsOpen) {
    //     message.success('[HydraBridge] Head is Open')
    //     handleHeadOpen(payload)
    //   } else if (payload.tag === HydraHeadTag.ReadyToFanout) {
    //     message.success('[HydraBridge] Ready to Fanout')
    //     bridge.sendCommand({
    //       command: HydraCommand.Fanout,
    //       afterSendCb() {
    //         message.success('[HydraBridge] Send command Fanout')
    //       }
    //     })
    //   } else if (payload.tag === HydraHeadTag.HeadIsClosed) {
    //     message.success('[HydraBridge] Head is Closed')
    //   } else if (payload.tag === HydraHeadTag.HeadIsFinalized) {
    //     message.success('[HydraBridge] Head Is Finalized')
    //   } else {
    //     console.log('>>> / Not Found handler')
    //   }
    // })
    bridge.events.on('onMessage', payload => {
      if (payload.tag === HydraHeadTag.Greetings) {
        handleGreetings(payload)
      } else if (payload.tag === HydraHeadTag.HeadIsOpen) {
        message.success('[HydraBridge] Head is Open')
        handleHeadOpen(payload)
      } else if (payload.tag === HydraHeadTag.ReadyToFanout) {
        message.success('[HydraBridge] Ready to Fanout')
        bridge.sendCommand({
          command: HydraCommand.Fanout,
          afterSendCb() {
            message.success('[HydraBridge] Send command Fanout')
          }
        })
      } else if (payload.tag === HydraHeadTag.HeadIsClosed) {
        message.success('[HydraBridge] Head is Closed')
      } else if (payload.tag === HydraHeadTag.HeadIsFinalized) {
        message.success('[HydraBridge] Head Is Finalized')
      } else {
        // console.log('>>> / Not Found handler')
      }
    })
  }

  function handleGreetings(payload: HydraPayload) {
    console.log('handleGreetings', payload)
    if (payload.tag !== HydraHeadTag.Greetings) return
    const bridge = getBridge()
    if (payload.headStatus === HydraHeadStatus.Final) {
      // Send init command
      bridge.commands.init()
    } else if (payload.headStatus === HydraHeadStatus.Initializing) {
      message.success('[HydraBridge] Hydra head Initializing, ready to click open')
    } else if (payload.headStatus === HydraHeadStatus.Open) {
      message.success('[HydraBridge] Hydra head is opened')
    } else if (payload.headStatus === HydraHeadStatus.Idle) {
      bridge.sendCommand({
        command: HydraCommand.Init,
        afterSendCb() {
          message.success('[HydraBridge] Send command Init')
        }
      })
    } else {
      console.log('>>> / Not Final')
    }
  }

  function handleHeadOpen(payload: HydraPayload) {
    console.log('handleHeadOpen', payload)
  }

  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  onBeforeUnmount(() => {
    const hydraBridge = getBridge()
    hydraBridge.disconnect()
    hydraBridge.events.all.clear()
  })

  return {
    hydraBridge,
    initSocketConnection
  }
})
