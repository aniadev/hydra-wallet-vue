<script lang="ts" setup>
  import AssetEntity from './AssetEntity.vue'
  import Choice from './gameplay/Choice.vue'
  import MessagePanel from './gameplay/MessagePanel.vue'
  import PlayerAvatar from './gameplay/PlayerAvatar.vue'

  const choice = ref('')
</script>

<template>
  <div class="relative flex h-full w-full flex-col p-4 text-white">
    <div class="flex w-full flex-shrink-0 items-center justify-between">
      <div class="w-90px flex-shrink-0">
        <div class="flex items-center">
          <icon icon="material-symbols:info-outline-rounded" height="24" />
          <span class="ml-1 text-sm">Info</span>
        </div>
      </div>
      <div class="flex-shrink-0">
        <div class="flex items-center gap-4">
          <PlayerAvatar :size="40" :player-info="{ name: 'John', avatarUrl: '/images/examples/user-avatar.png' }" />
          <div class="">
            <span class="text-base">vs</span>
          </div>
          <div class="rounded-2 size-10">
            <PlayerAvatar :size="40" :player-info="{ name: 'Jayce', avatarUrl: '/images/examples/user-avatar.png' }" />
          </div>
        </div>
      </div>
      <div class="w-90px flex-shrink-0">
        <div class="flex items-center">
          <icon icon="material-symbols:history" height="24" />
          <span class="ml-1 text-sm">History</span>
        </div>
      </div>
    </div>
    <div class="flex-grow-1 my-4 overflow-y-hidden">
      <MessagePanel />
    </div>
    <div class="flex-shrink-0">
      <div class="flex items-center justify-between gap-6">
        <div class="flex-1">
          <Choice type="ROCK" @click="choice = 'ROCK'" :active="choice === 'ROCK'" />
        </div>
        <div class="flex-1">
          <Choice type="PAPER" @click="choice = 'PAPER'" :active="choice === 'PAPER'" />
        </div>
        <div class="flex-1">
          <Choice type="SCISSORS" @click="choice = 'SCISSORS'" :active="choice === 'SCISSORS'" />
        </div>
      </div>
      <a-button class="btn-primary mt-4 w-full" type="primary" disabled>Confirm</a-button>
      <a-input class="mt-4 w-full" size="large" placeholder="Type message...">
        <template #suffix>
          <icon icon="tabler:send" height="20" class="text-gray-4" />
        </template>
      </a-input>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
