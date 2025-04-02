<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import PlayerAvatar from './PlayerAvatar.vue'
  import { useGameRPSStore } from '../../store'
  import type { Message } from '../../types'

  const props = withDefaults(
    defineProps<{
      message: Readonly<Message>
      viewMode?: 'left' | 'right'
    }>(),
    {
      viewMode: 'left'
    }
  )

  const avatarUrl = computed(() => {
    return props.message.type === 'BOT' ? '/images/logo-hexcore-600x600.webp' : '/images/examples/user-avatar.png'
  })
</script>

<template>
  <div class="message-item" :class="{ right: props.viewMode === 'right' }">
    <PlayerAvatar
      class="flex-shrink-0"
      :size="32"
      :player-info="{
        name: 'John',
        avatarUrl: avatarUrl,
        address: ''
      }"
      :status="props.message.type === 'BOT' ? 'disabled' : 'disabled'"
    />
    <div class="message-item__content flex-grow">
      <div class="rounded-3 message-item__content-inner p-4 py-1">
        <span class="inner-text m-0" style="word-break: break-word">
          <span class="text-xs">{{ props.message.content }}</span>
        </span>
        <div class="mt-2 flex justify-end">
          <span class="inner-time text-10px leading-3">
            {{ useDateFormat(props.message.createdAt, 'hh:mm:ss A') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .message-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 8px;

    .message-item__content {
      margin-left: 8px;

      .message-item__content-inner {
        background: #f5f4fa;

        .inner-text {
          color: #212121;
        }
        .inner-time {
          color: #6d6563;
        }
      }
    }

    &.right {
      flex-direction: row-reverse;
      .message-item__content {
        margin-right: 8px;
        margin-left: 0;
        .message-item__content-inner {
          background: #20ad49;
          .inner-text {
            color: #fff;
          }
          .inner-time {
            color: #fff;
          }
        }
      }
    }
  }
  .message-item:last-child {
    // margin-bottom: 0;
  }
</style>
