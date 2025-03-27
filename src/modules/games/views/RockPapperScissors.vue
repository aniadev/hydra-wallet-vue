<script lang="ts" setup>
  import Background from '../rps/components/Background.vue'
  import GamePlay from '../rps/components/GamePlay.vue'
  import Introduce from '../rps/components/Introduce.vue'
  import Lobby from '../rps/components/Lobby.vue'
  import { useGameRPSStore } from '../rps/store'
  import type { Room } from '../rps/types'
  import { useGameStore } from '../stores/gameStore'

  const user = ref({
    name: 'John Where'
  })

  const isIntroReady = ref(false)
  const onIntroReady = () => {
    isIntroReady.value = true
  }

  const gameRPSStore = useGameRPSStore()
  const gameStore = useGameStore()
  const gameRoom = computed(() => gameRPSStore.currentRoom)
  const onSelectRoom = (room: Room) => {
    gameRPSStore.setCurrentRoom(room)
  }
  const router = useRouter()
  onMounted(() => {
    if (!gameStore.gameAccount) {
      router.push({ name: 'Games' })
    }
    gameRPSStore.init()
  })

  onUnmounted(() => {
    gameRPSStore.cleanUp()
  })
</script>

<template>
  <div class="relative h-full w-full">
    <NetworkBadge />
    <Background />
    <Introduce v-if="!isIntroReady" @ready="onIntroReady()" />
    <Lobby v-else-if="isIntroReady && !gameRoom" @select="onSelectRoom" />
    <GamePlay v-else-if="isIntroReady && gameRoom" :room="gameRoom" :user="user" />
  </div>
</template>

<style lang="scss" scoped></style>
