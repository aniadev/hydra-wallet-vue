<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'
  import type { Room } from '../../types'
  import LobbyItem from '../LobbyItem.vue'

  const emits = defineEmits<{
    new: []
    select: [room: Room]
  }>()

  const gameStore = useGameRPSStore()
  const { rooms } = storeToRefs(gameStore)

  const refreshRooms = async () => {
    rooms.value.items = []
    await gameStore.fetchRooms()
  }
</script>

<template>
  <div class="relative h-full w-full overflow-y-auto">
    <div class="px-4 pt-4">
      <div class="mb-8 flex h-6 items-center justify-between">
        <div class="flex size-6 items-center text-white" @click="$router.push({ name: 'Games' })">
          <icon icon="ic:round-keyboard-backspace" height="24" />
        </div>
        <span class="text-2xl font-bold text-white">Lobby</span>
        <div class="flex size-6 items-center">
          <icon
            icon="ic:round-sync"
            height="24"
            @click="refreshRooms()"
            class="animate__animated text-white"
            :class="{ animate__rotateIn: rooms.isLoading }"
          />
        </div>
      </div>
      <a-row :gutter="[24, 36]" gap="">
        <!-- <a-col :span="8">
          <LobbyItem @click="emits('new')" v-if="!loading" />
        </a-col> -->
        <a-col :span="8" v-for="(item, i) in rooms.items" :key="i">
          <LobbyItem :room="item" @click="emits('select', item)" />
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
