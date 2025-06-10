<script lang="ts" setup>
  import { message } from 'ant-design-vue'
  import { useGameRPSStore } from '../../store/game.store'
  import AssetEntity from '../AssetEntity.vue'

  const emits = defineEmits<{
    ready: []
  }>()
  const gameStore = useGameRPSStore()

  const isLoading = ref(false)
  const animatedOut = ref(false)
  const onClickReady = async () => {
    isLoading.value = true
    try {
      if (!gameStore.networkConnected) {
        // Init socket connection
        await gameStore.init()
      }
      await gameStore.fetchRooms()
      await new Promise(resolve => setTimeout(resolve, 1000))
      animatedOut.value = true
      await new Promise(resolve => setTimeout(resolve, 1000))
      emits('ready')
    } catch (error) {
      console.error(error)
      message.error('Error when fetching rooms, please try again later')
    } finally {
      isLoading.value = false
    }
  }
</script>

<template>
  <div class="relative h-full w-full">
    <div
      class="absolute left-4 top-4 flex items-center text-white hover:cursor-pointer"
      @click="$router.push({ name: 'Games' })"
    >
      <icon icon="ic:round-keyboard-backspace" height="24" />
    </div>
    <div class="absolute left-1/2 top-6 -translate-x-1/2">
      <AssetEntity
        class="animate__animated"
        asset="BANNER_TEXT"
        :size="150"
        :class="[animatedOut ? 'animate__bounceOutUp' : 'animate__bounceInDown']"
      />
    </div>

    <div class="absolute left-1/2 top-1/2 -translate-x-1/2">
      <div
        class="animate__bounceInRight animate__animated"
        :class="[animatedOut ? 'animate__bounceOutLeft' : 'animate__bounceInRight']"
      >
        <a-button
          :loading="isLoading"
          type="default"
          class="btn-primary shadow-[3px_4px_0px_0_#000]"
          @click="onClickReady"
        >
          Let's go !
        </a-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
