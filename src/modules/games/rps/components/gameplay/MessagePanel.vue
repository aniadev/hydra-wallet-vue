<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import MessageItem from './MessageItem.vue'
  import PlayerAvatar from './PlayerAvatar.vue'
  import { useGameRPSStore } from '../../store/game.store'

  const refMessagePanel = ref<HTMLElement | null>(null)
  onMounted(async () => {
    scrollToBottom()

    gameRPSStore.gameSocketClient.listen('GAME_CHAT', payload => {
      const { from, to, timestamp, message } = payload.data
    })
  })

  const scrollToBottom = async () => {
    await nextTick()
    if (refMessagePanel.value) {
      refMessagePanel.value.scrollTo({
        top: refMessagePanel.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  const gameRPSStore = useGameRPSStore()
  const { messages } = storeToRefs(gameRPSStore)
  watch(
    () => messages.value.length,
    () => {
      scrollToBottom()
    }
  )

  const getMsgStyle = (index: number) => {
    const pos = messages.value.length - index - 1
    const op = Math.max(0.4, 1 - pos * 0.2)
    return {
      opacity: `${op} !important`
    }
  }
</script>

<template>
  <div class="rounded-3 message-panel h-full w-full overflow-y-auto overflow-x-hidden px-4" ref="refMessagePanel">
    <div class="pt-full w-full">
      <MessageItem v-for="(item, i) in messages" :key="i" :message="item" :style="getMsgStyle(i)" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .message-panel {
    background: linear-gradient(0deg, #fff 0%, rgba(26, 26, 26, 0) 100%);
  }
</style>
