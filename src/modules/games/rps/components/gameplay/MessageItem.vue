<script lang="ts" setup>
  import PlayerAvatar from './PlayerAvatar.vue'

  const props = withDefaults(
    defineProps<{
      viewMode?: 'left' | 'right'
    }>(),
    {
      viewMode: 'left'
    }
  )
</script>

<template>
  <div class="message-item" :class="{ right: props.viewMode === 'right' }">
    <PlayerAvatar
      class="flex-shrink-0"
      :size="32"
      :player-info="{ name: 'John', avatarUrl: '/images/examples/user-avatar.png' }"
    />
    <div class="message-item__content flex-grow">
      <div class="rounded-3 message-item__content-inner p-4 pb-1">
        <p class="inner-text m-0 text-xs">
          This AI chatbot has been developed to optimize communication and simplify work processes, ultimately leading
          to smoother operations.
        </p>
        <div class="mt-2 flex justify-end">
          <span class="inner-time text-10px leading-3">8:00 PM</span>
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
