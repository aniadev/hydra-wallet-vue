<script lang="ts" setup>
  import { generateAvatarURL } from '@cfx-kit/wallet-avatar'

  const props = withDefaults(
    defineProps<{
      playerInfo?: {
        name: string
        avatarUrl: string
        address: string
      }
      size?: number
      status?: 'pending' | 'selected' | 'disabled' | ''
      cirle?: boolean
    }>(),
    {
      playerInfo: () => ({
        name: 'John Doe',
        avatarUrl: '/images/examples/user-avatar.png',
        address: ''
      }),
      size: 40,
      status: '',
      cirle: false
    }
  )

  const avatarUrl = computed(() => {
    if (props.playerInfo.avatarUrl) {
      return props.playerInfo.avatarUrl
    }
    return generateAvatarURL(props.playerInfo.address || '0x000000000')
  })

  const avatarStyle = computed(() => ({
    width: `${props.size - 3}px`,
    height: `${props.size - 3}px`,
    borderRadius: props.cirle ? '9999px' : '11px'
  }))
  const containerStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`
  }))
</script>

<template>
  <div class="user-avatar" :style="containerStyle" :class="[props.status]">
    <div class="-translate-1/2 absolute left-1/2 top-1/2 z-10 bg-white" :style="avatarStyle">
      <img :src="avatarUrl" alt="user-avatar" width="40" height="40" class="rounded-inherit h-full w-full" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(-360deg);
    }
  }

  .user-avatar {
    padding: 2px;
    border-radius: 12px;
    position: relative;
    overflow: hidden;

    --color-pending: #61f953;
    --color-disabled: #b5b5b5;
    --color-selected: #f653f9;

    &.pending {
      &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        top: 50%;
        left: 50%;
        background: var(--color-pending); /* fallback for old browsers */
        background: -webkit-linear-gradient(45deg, transparent, var(--color-pending)); /* Chrome 10-25, Safari 5.1-6 */
        background: linear-gradient(
          45deg,
          transparent,
          var(--color-pending)
        ); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */

        z-index: 9;
        border-radius: inherit;
        transform-origin: top left;
        animation: rotate 2s linear 0s infinite;
      }
    }
    &.selected {
      background-color: var(--color-selected);
    }
  }
</style>
