<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import PlayerAvatar from './PlayerAvatar.vue'
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
    if (props.message.from?.avatar) {
      return props.message.from.avatar
    }
    return props.message.type === 'BOT' ? '/logo-100x100.svg' : '/images/examples/user-avatar.png'
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
      cirle
      :status="props.message.type === 'BOT' ? 'disabled' : 'disabled'"
    />
    <div class="message-item__content flex-grow">
      <div class="rounded-3 message-item__content-inner p-4 py-1 pt-2">
        <p class="text-green-7 mb-1 text-sm leading-5">{{ props.message.from?.alias || 'Hydra Bot' }}</p>

        <p class="inner-text font-400 m-0 text-xs leading-4" style="word-break: break-word">
          {{ props.message.content }}
          <!-- Lorem ipsum dolor, sit amet consectetur adipisicing elit. Quae a perferendis et minima velit ipsum voluptatum?
          Odit, harum? Dolorum accusantium tempora cupiditate necessitatibus laborum odio, sint nisi saepe ducimus eius. -->
        </p>
        <div class="mt-1 flex justify-end">
          <span class="inner-time text-10px leading-3">
            {{ useDateFormat(props.message.timestamp, 'hh:mm:ss A') }}
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
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;

      .message-item__content-inner {
        background: #f5f4fa;
        width: fit-content;
        max-width: 90%;
        min-width: 180px;

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
        justify-content: flex-end;
        .message-item__content-inner {
          background: #73ff9e3b;

          .inner-text {
            color: #333;
          }
          .inner-time {
            color: #888;
          }
        }
      }
    }
  }
  .message-item:last-child {
    // margin-bottom: 0;
  }
</style>
