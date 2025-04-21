<script lang="ts" setup>
  import { message } from 'ant-design-vue'
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
  const socketConnected = computed(() => gameRPSStore.socketConnected)
  const onSelectRoom = (room: Room) => {
    if (!room.isOnline) {
      message.error('Room is not available, please try other room')
      return
    }
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
    <div class="z-90 pointer-events-none absolute right-1 top-1 flex select-none items-center justify-center">
      <icon icon="ic:round-network-wifi" class="text-green-4 size-3" v-if="socketConnected" />
      <icon icon="ic:round-signal-wifi-connected-no-internet-4" class="text-red-4 size-3" v-else />
    </div>
    <NetworkBadge />
    <Background />
    <Introduce v-if="!isIntroReady" @ready="onIntroReady()" />
    <Lobby v-else-if="isIntroReady && !gameRoom" @select="onSelectRoom" />
    <GamePlay v-else-if="isIntroReady && gameRoom" :room="gameRoom" :user="user" />
  </div>
</template>

<style lang="scss" scoped></style>
