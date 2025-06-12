<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'

  const gameRPSStore = useGameRPSStore()
  const { currentRoom, socketRoom } = storeToRefs(gameRPSStore)

  const inputRef = ref<HTMLInputElement | null>(null)
  const inputString = ref('')

  const submit = (e: KeyboardEvent) => {
    if (inputString.value.trim()) {
      gameRPSStore.gameSocketClient.emit('GAME_CHAT', {
        gameRoomId: currentRoom.value!.id,
        socketRoom: socketRoom.value,
        message: inputString.value
      })
      inputString.value = ''
    }
  }
</script>

<template>
  <div class="">
    <a-input
      ref="inputRef"
      v-model:value="inputString"
      class="w-full"
      size="large"
      placeholder="Type message..."
      @keydown.enter="submit"
    >
      <template #suffix>
        <icon
          icon="tabler:send"
          height="20"
          class="text-gray-4"
          hover="cursor-pointer"
          :class="{ '!text-primary': !!inputString.trim() }"
          @click="submit"
        />
      </template>
    </a-input>
  </div>
</template>

<style lang="scss" scoped></style>
