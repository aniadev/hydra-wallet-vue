<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store'

  const gameStore = useGameRPSStore()
  const { round, isShowPopupExit } = storeToRefs(gameStore)

  const emits = defineEmits<{
    onExit: []
  }>()
  const onClickContinue = () => {
    isShowPopupExit.value = false
  }
  const onClickExit = () => {
    emits('onExit')
    gameStore.exitRoom()
  }
</script>

<template>
  <div class="popup-exit">
    <a-modal v-model:open="isShowPopupExit" width="410px" title="" centered :closable="false">
      <div class="flex flex-col items-center justify-center">
        <div class="text-lg font-semibold">Quit this game?</div>
      </div>
      <template #footer>
        <a-row :gap="0" :gutter="16">
          <a-col :span="8">
            <a-button class="btn-tertiary w-full" type="primary" size="large" @click="onClickExit()"> Exit </a-button>
          </a-col>
          <a-col :span="16">
            <a-button class="btn-primary w-full" type="primary" size="large" @click="onClickContinue">
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
