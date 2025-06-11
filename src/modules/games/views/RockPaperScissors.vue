<script lang="ts" setup>
  import { Button, message, notification } from 'ant-design-vue'
  import Background from '../rps/components/Background.vue'
  import IntroduceScene from '../rps/components/scenes/Introduce.vue'
  import LobbyScene from '../rps/components/scenes/Lobby.vue'
  import GamePlayScene from '../rps/components/scenes/GamePlay.vue'
  import { useGameRPSStore } from '../rps/store/game.store'
  import type { Room } from '../rps/types'
  import { useGameAuthStore } from '../stores/gameAuthStore'
  import PopupInputPassword from '../rps/components/PopupInputPassword.vue'

  const user = ref({
    name: 'John Where'
  })

  const isIntroReady = ref(false)
  const onIntroReady = () => {
    isIntroReady.value = true
  }

  const gameRPSStore = useGameRPSStore()
  const gameAuthStore = useGameAuthStore()

  const currentRoom = computed(() => gameRPSStore.currentRoom)
  const socketConnected = computed(() => gameRPSStore.networkConnected)

  const roomClicked = ref<Room | null>(null)
  const onSelectRoom = (room: Room) => {
    roomClicked.value = room
    if (!room.isActive) {
      // validate room
      message.error('Room is not available, please try other room')
      return
    }
    if (room.requiredPassword) {
      // validate password
      isShowPopupInputPassword.value = true
      return
    }
    handleJoinRoom(room)
  }
  const router = useRouter()
  onMounted(() => {
    if (!gameAuthStore.gameAccount) {
      router.push({ name: 'Games' })
    }
    gameRPSStore.init()
  })

  onUnmounted(() => {
    console.log('Remove all listeners')
    gameRPSStore.gameSocketClient.removeAllListeners()
  })

  watch(socketConnected, () => {
    console.log('socketConnected.value', socketConnected.value)
    if (!socketConnected.value) {
      const close = () => {
        console.log('Notification was closed. Either the close button was clicked or the duration time elapsed.')
      }
      const key = `open${Date.now()}`
      notification.error({
        message: 'Connection lost',
        description: 'Connection to game server is lost. Please check your internet connection and try again.',
        btn: () =>
          h(
            Button,
            {
              type: 'primary',
              size: 'small',
              onClick: () => notification.close(key)
            },
            { default: () => 'Confirm' }
          ),
        key,
        onClose: close
      })
    }
  })

  const isShowPopupInputPassword = ref(false)
  const onSubmitPassword = (password: string) => {
    isShowPopupInputPassword.value = false
    if (!roomClicked.value) return
    handleJoinRoom(roomClicked.value, password)
  }

  function handleJoinRoom(room: Room, password?: string) {
    gameRPSStore.gameSocketClient.emit('ROOM_ACTION', {
      roomId: room.id,
      action: 'LEAVE',
      socketRoom: `GAME.${room.code}`
    })
    gameRPSStore.gameSocketClient.emit('ROOM_ACTION', {
      roomId: room.id,
      action: 'JOIN',
      password
    })
    gameRPSStore.gameSocketClient.listen('ROOM_ACTION', payload => {
      if (payload.status === 'success') {
        if (payload.action === 'JOIN' && payload.data.room.id === room.id) {
          const { game, users, room, socketRoom } = payload.data
          gameRPSStore.setCurrentRoom(room, socketRoom)
        }
      } else {
        if (payload.message === 'ROOM_IS_FULL') {
          message.error('Room is full, please try other room')
          return
        }
        message.error(payload.message)
      }
    })
  }
</script>

<template>
  <div class="relative h-full w-full">
    <div class="z-90 pointer-events-none absolute right-1 top-1 flex select-none items-center justify-center">
      <icon icon="ic:round-network-wifi" class="text-green-4 size-3" v-if="socketConnected" />
      <icon icon="ic:round-signal-wifi-connected-no-internet-4" class="text-red-4 size-3" v-else />
    </div>
    <NetworkBadge />
    <Background />
    <IntroduceScene v-if="!isIntroReady" @ready="onIntroReady()" />
    <LobbyScene v-else-if="isIntroReady && !currentRoom" @select="onSelectRoom" />
    <GamePlayScene v-else-if="isIntroReady && currentRoom" :room="currentRoom" :user="user" />
    <PopupInputPassword v-model:open="isShowPopupInputPassword" @submit="onSubmitPassword" />
  </div>
</template>

<style lang="scss" scoped></style>
