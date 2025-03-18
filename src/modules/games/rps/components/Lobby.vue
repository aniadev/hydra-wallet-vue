<script lang="ts" setup>
  import type { Room } from '../types'
  import LobbyItem from './LobbyItem.vue'

  const emits = defineEmits<{
    new: []
    select: []
  }>()

  const rooms = ref<Room[]>([
    {
      name: 'Room 1',
      isOnline: true,
      betAmount: 5000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 2',
      isOnline: true,
      betAmount: 5000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 3',
      isOnline: true,
      betAmount: 5000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 4',
      isOnline: true,
      betAmount: 5000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 5',
      isOnline: true,
      betAmount: 6000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 6',
      isOnline: true,
      betAmount: 6000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 7',
      isOnline: true,
      betAmount: 6000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 8',
      isOnline: true,
      betAmount: 6000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 9',
      isOnline: true,
      betAmount: 7000000,
      players: [],
      maxPlayers: 2
    },
    {
      name: 'Room 10',
      isOnline: true,
      betAmount: 7000000,
      players: [],
      maxPlayers: 2
    }
  ])
</script>

<template>
  <div class="relative h-full w-full overflow-y-auto">
    <div class="px-4 pt-8">
      <a-row :gutter="[24, 36]" gap="">
        <a-col :span="8">
          <LobbyItem @click="emits('new')" />
        </a-col>
        <a-col :span="8" v-for="(item, i) in rooms" :key="i">
          <LobbyItem :room="item" @click="emits('select')" />
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
