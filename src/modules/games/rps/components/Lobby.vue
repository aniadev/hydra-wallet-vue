<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../store'
  import type { Room } from '../types'
  import LobbyItem from './LobbyItem.vue'

  const emits = defineEmits<{
    new: []
    select: [room: Room]
  }>()

  const gameStore = useGameRPSStore()
  const { rooms } = storeToRefs(gameStore)

  const loading = ref(false)
  const refreshRooms = async () => {
    loading.value = true
    rooms.value = []
    await gameStore.fetchRooms()
    loading.value = false
  }
</script>

<template>
  <div class="relative h-full w-full overflow-y-auto">
    <div class="px-4 pt-8">
      <div class="mb-2 flex h-6 items-center justify-between">
        <div class="size-6"></div>
        <span class="text-2xl font-bold text-white">Lobby</span>
        <div class="flex size-6 items-center">
          <icon
            icon="ic:round-sync"
            height="24"
            @click="refreshRooms()"
            class="animate__animated text-white"
            :class="{ animate__rotateIn: loading }"
          />
        </div>
      </div>
      <a-row :gutter="[24, 36]" gap="">
        <a-col :span="8">
          <LobbyItem @click="emits('new')" />
        </a-col>
        <a-col :span="8" v-for="(item, i) in rooms" :key="i">
          <LobbyItem :room="item" @click="emits('select', item)" />
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
