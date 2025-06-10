<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'

  const gameRPSStore = useGameRPSStore()
  const { currentRound, isShowPopupExit, loadingExit, currentRoom, socketRoom } = storeToRefs(gameRPSStore)
  loadingExit.value = false
  const exitMessages = ref<{ message: string; key: string }[]>([])
  const refMessageContainer = ref<HTMLDivElement>()

  const emits = defineEmits<{
    onExit: []
  }>()
  const onClickContinue = () => {
    isShowPopupExit.value = false
  }

  const wait = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const onClickExit = async () => {
    loadingExit.value = true
    try {
      if (!currentRoom.value) return
      gameRPSStore.gameSocketClient.emit('ROOM_ACTION', {
        roomId: currentRoom.value.id,
        action: 'LEAVE',
        socketRoom: socketRoom.value
      })
      gameRPSStore.setCurrentRoom(null, null)
      isShowPopupExit.value = false
    } catch (error) {
      console.error(error)
    } finally {
      loadingExit.value = false
    }
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
