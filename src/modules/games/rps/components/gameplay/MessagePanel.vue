<script lang="ts" setup>
  import MessageItem from './MessageItem.vue'
  import PlayerAvatar from './PlayerAvatar.vue'

  const refMessagePanel = ref<HTMLElement | null>(null)
  onMounted(async () => {
    await nextTick()
    if (refMessagePanel.value) {
      refMessagePanel.value.scrollTo({
        top: refMessagePanel.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
</script>

<template>
  <div class="rounded-3 message-panel h-full w-full overflow-y-auto overflow-x-hidden px-4" ref="refMessagePanel">
    <div class="w-full">
      <MessageItem />
      <MessageItem view-mode="right" />
      <MessageItem view-mode="right" />
      <MessageItem view-mode="right" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .message-panel {
    background: linear-gradient(0deg, #fff 0%, rgba(26, 26, 26, 0) 100%);
  }
</style>
