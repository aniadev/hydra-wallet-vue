<script lang="ts" setup>
  import { formatId } from '@/utils/format'
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../store/game.store'
  import { useGameAuthStore } from '../../stores/gameAuthStore'
  import type { User } from '../types'
  import { message } from 'ant-design-vue'

  const gameRPSStore = useGameRPSStore()
  const { onlineUsers, currentRoom } = storeToRefs(gameRPSStore)
  const { gameAccount } = useGameAuthStore()

  const visible = defineModel('open', { type: Boolean, default: true })
  const invitedUsers = ref<User['walletAddress'][]>([])

  function onClickInvite(user: User) {
    console.log('onClickInvite', user)
    invitedUsers.value.push(user.walletAddress)
    gameRPSStore.gameSocketClient.emit('GAME_INVITE', {
      toAddress: user.walletAddress,
      gameRoomId: currentRoom.value!.id,
      gameRoomCode: currentRoom.value!.code,
      message: 'Join me in the game'
    })
  }

  watch(
    () => visible.value,
    () => {
      if (visible.value) {
        invitedUsers.value = []
      }
    }
  )
</script>

<template>
  <a-modal
    v-model:open="visible"
    width="270px"
    title=""
    centered
    :closable="true"
    :mask-closable="true"
    :footer="false"
    class="popup-invite-player"
  >
    <div class="flex flex-col justify-center pb-2 pl-3 pr-1 pt-4">
      <p class="m-0 text-center text-base font-semibold">Online players</p>
      <ul class="max-h-332px scroll-bar-primary m-0 mt-2 overflow-y-auto p-0">
        <li
          class="rounded-2 flex items-center justify-between px-1 py-2"
          hover="cursor-pointer bg-[#c7bab8] bg-opacity-10"
          :class="{ '!hidden': user.walletAddress === gameAccount?.walletAddress }"
          v-for="user in onlineUsers"
          :key="user.id"
        >
          <div class="flex-shrink-0">
            <a-avatar shape="square" :size="38" :src="user.avatar"> </a-avatar>
          </div>
          <div class="flex-grow-1 ml-4 flex flex-col justify-center">
            <span class="">{{ user.alias }}</span>
            <span class="mb-1 text-xs">{{ formatId(user.walletAddress, 8, 4) }}</span>
          </div>
          <div class="flex-shrink-0">
            <a-button type="ghost" size="middle" class="text-green-6 px-1" @click="onClickInvite(user)">
              <icon icon="ic:round-person-add-alt-1" height="24" v-if="!invitedUsers.includes(user.walletAddress)" />
              <icon icon="ic:round-check" height="24" v-else />
            </a-button>
          </div>
        </li>
      </ul>
    </div>
  </a-modal>
</template>

<style lang="scss">
  .popup-invite-player {
    .ant-modal-content {
      padding: 0 !important;
    }
    .ant-modal-close {
      top: 8px;
      right: 8px;
    }
  }
</style>
