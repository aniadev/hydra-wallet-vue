<script lang="ts" setup>
  import Background from '../rps/components/Background.vue'
  import GamePlay from '../rps/components/GamePlay.vue'
  import Introduce from '../rps/components/Introduce.vue'
  import Lobby from '../rps/components/Lobby.vue'
  import type { Room } from '../rps/types'

  const user = ref({
    name: 'John Where'
  })

  const isIntroReady = ref(false)
  const onIntroReady = () => {
    isIntroReady.value = true
  }

  const gameRoom = ref<Room | null>(null)
  const onSelectRoom = () => {
    console.log('onSelectRoom')
    gameRoom.value = {
      name: 'Room 1',
      players: [
        { id: 'player-1', name: 'John Doe' },
        { id: 'player-2', name: 'Jane Doe' }
      ],
      betAmount: 5000000,
      isOnline: true,
      maxPlayers: 2
    }
  }
</script>

<template>
  <div class="relative h-full w-full">
    <NetworkBadge />
    <Background />
    <Introduce v-if="!isIntroReady" @ready="onIntroReady()" />
    <Lobby v-else-if="isIntroReady && !gameRoom" @select="onSelectRoom" />
    <GamePlay v-else :room="gameRoom" :user="user" />
  </div>
</template>

<style lang="scss" scoped></style>
