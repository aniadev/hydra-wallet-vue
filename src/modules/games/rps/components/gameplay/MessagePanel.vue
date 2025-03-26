<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import MessageItem from './MessageItem.vue'
  import PlayerAvatar from './PlayerAvatar.vue'
  import { useGameRPSStore } from '../../store'

  const refMessagePanel = ref<HTMLElement | null>(null)
  onMounted(async () => {
    scrollToBottom()
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

  const { messages } = storeToRefs(useGameRPSStore())
  watch(
    () => messages.value.length,
    () => {
      scrollToBottom()
    }
  )
</script>

<template>
  <div class="rounded-3 message-panel h-full w-full overflow-y-auto overflow-x-hidden px-4" ref="refMessagePanel">
    <div class="pt-full w-full">
      <MessageItem v-for="(item, i) in messages" :key="i" :message="item" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .message-panel {
    background: linear-gradient(0deg, #fff 0%, rgba(26, 26, 26, 0) 100%);
  }
</style>
