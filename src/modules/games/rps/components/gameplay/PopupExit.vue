<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store'
  import { HydraHeadStatus, HydraHeadTag } from '@/lib/hydra-bridge/types/payload.type'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'

  const gameStore = useGameRPSStore()
  const { round, isShowPopupExit, loadingExit, currentRoom } = storeToRefs(gameStore)
  loadingExit.value = false
  const exitMessages = ref<{ message: string; key: string }[]>([])
  const refMessageContainer = ref<HTMLDivElement>()
  const contestationDeadline = ref<string>()

  const emits = defineEmits<{
    onExit: []
  }>()
  const onClickContinue = () => {
    isShowPopupExit.value = false
  }

  const wait = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const addMessage = (message: string, key?: string) => {
    exitMessages.value.push({ message, key: key || message })
    nextTick(() => {
      refMessageContainer.value?.scrollTo({
        top: refMessageContainer.value?.scrollHeight,
        behavior: 'smooth'
      })
    })
  }
  const changeMessage = (key: string, newMessage: string) => {
    const index = exitMessages.value.findIndex(item => item.key === key)
    if (index !== -1) {
      exitMessages.value[index].message = newMessage
    }
  }

  const waitHeadClosed = async () => {
    await new Promise(resolve => {
      gameStore.hydraBridge?.commands.close()
      const retryCloseInterval = setInterval(() => {
        gameStore.hydraBridge?.commands.close()
      }, 30000)
      gameStore.hydraBridge?.events.on('onMessage', payload => {
        if (payload.tag === HydraHeadTag.HeadIsClosed) {
          contestationDeadline.value = useDateFormat(payload.contestationDeadline, 'HH:mm:ss A DD/MM/YYYY').value
          addMessage('Hydra Node closed the head')
          addMessage('Contestation period is over at ' + contestationDeadline.value)
          gameStore.hydraBridge?.events.off('onMessage')
          clearInterval(retryCloseInterval)
          resolve(true)
        } else if (payload.tag === HydraHeadTag.CommandFailed) {
          console.log('payload', payload)
          // const contestationDeadline = payload.state?.contents?.contestationDeadline
          // if (contestationDeadline) {
          //   contestationDeadline.value = useDateFormat(contestationDeadline, 'HH:mm:ss A DD/MM/YYYY').value
          //   addMessage('Contestation period is over at ' + contestationDeadline.value)
          // }
          gameStore.hydraBridge?.events.off('onMessage')
          clearInterval(retryCloseInterval)
          resolve(true)
        }
      })
    })
  }

  const onClickExit = async () => {
    // TODO:
    /**
     * 1. Send command to Hydra Node: {tag: 'Close'}
     * 2. Wait for Hydra Node to close the head
     * 3. When Hydra Node is closed, Client will receive event with HeadTag: HeadIsClosed
     * 4. Wait for Hydra Node to change state to FanoutPossible/ReadyToFanout
     * 5. When Hydra Node is in FanoutPossible state, Client will send command to Hydra Node: {tag: 'Fanout'}
     * 6. Wait for Hydra Node to change state to Finalized
     * 7. When Hydra Node is in Finalized state, Client will receive event with HeadTag: HeadIsFinalized
     * 8. Close popup
     */
    loadingExit.value = true
    // Check current state of Hydra Node
    const currentStatus = await gameStore.hydraBridge?.headStatus
    if (currentStatus === HydraHeadStatus.Open) {
      await gameStore.buildTxReset()
      addMessage('Reset transaction is sent to Hydra Node')
    }
    await wait(500)
    addMessage('Send command to Hydra Node: {tag: "Close"}')
    await waitHeadClosed()
    addMessage('Waiting contestation period...', 'contestation')
    const countdown = (seconds?: number) => {
      if (!contestationDeadline.value) return
      if (!seconds || seconds <= 0) return
      const now = new Date()
      const deadline = new Date(contestationDeadline.value)
      const diff = deadline.getTime() - now.getTime()
      const _seconds = Math.floor(diff / 1000)
      changeMessage('contestation', `Contestation period is over in ${_seconds} seconds`)
      setTimeout(() => countdown(_seconds - 1), 1000)
    }
    countdown()

    await new Promise(resolve => {
      gameStore.hydraBridge?.events.on('onMessage', payload => {
        if (payload.tag === HydraHeadTag.ReadyToFanout) {
          addMessage('Hydra Node is in ReadyToFanout state')
          addMessage('Send command to Hydra Node: {tag: "Fanout"}')
          gameStore.hydraBridge?.commands.fanout()
          gameStore.hydraBridge?.events.off('onMessage')
          resolve(true)
        }
      })
    })
    // Wait for Hydra Node to change state to Finalized
    await new Promise(resolve => {
      gameStore.hydraBridge?.events.on('onMessage', payload => {
        if (payload.tag === HydraHeadTag.HeadIsFinalized) {
          addMessage('Hydra Node is in Finalized state')
          addMessage(
            `You will receive ${BigNumber(gameStore.myTotalLovelace)
              .div(10 ** 6)
              .toString()} ${networkInfo.symbol}`
          )
          addMessage('Ready to exit the game')
          gameStore.hydraBridge?.events.off('onMessage')
          resolve(true)
        }
      })
    })

    gameStore.socketClient
      ?.leaveRoom()
      .then(() => {
        // cleanUp
        addMessage('Bye bye!')
        return wait(1000)
      })
      .then(() => {
        isShowPopupExit.value = false
        gameStore.cleanUp()
      })
      .catch(e => {
        console.error('Error: ', e)
      })
  }
</script>

<template>
  <div class="popup-exit">
    <a-modal
      v-model:open="isShowPopupExit"
      width="410px"
      title=""
      centered
      :closable="false"
      :mask-closable="!loadingExit"
    >
      <div class="flex flex-col items-center justify-center">
        <div class="text-lg font-semibold">Quit this game?</div>
        <div
          ref="refMessageContainer"
          class="bg-gray-2 rounded-2 scrollbar-hidden h-20 w-full overflow-y-auto p-1"
          v-show="exitMessages.length"
        >
          <div
            v-for="(item, index) in exitMessages"
            :key="index"
            class="animate__fadeInUp animate__animated animate__faster flex items-center font-mono text-xs text-gray-500"
            :style="{ opacity: `${index === exitMessages.length - 1 ? 1 : 0.2} !important` }"
          >
            <span class="mr-1">></span>
            <span>{{ item.message }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <a-row :gap="0" :gutter="16">
          <a-col :span="8">
            <a-button
              class="btn-tertiary w-full"
              type="primary"
              size="large"
              @click="onClickExit()"
              :loading="loadingExit"
            >
              Exit
            </a-button>
          </a-col>
          <a-col :span="16">
            <a-button
              :disabled="loadingExit"
              class="btn-primary w-full"
              type="primary"
              size="large"
              @click="onClickContinue"
            >
              Continue playing
            </a-button>
          </a-col>
        </a-row>
      </template>
    </a-modal>
    <div class="flex items-center hover:cursor-pointer" @click="isShowPopupExit = true">
      <slot>
        <icon icon="ic:round-keyboard-backspace" height="24" />
        <span class="ml-1 text-sm">Quit</span>
      </slot>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
