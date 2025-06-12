<script lang="ts" setup>
  import type { Room } from '../types'
  import AssetEntity from './AssetEntity.vue'

  import BigNumber from 'bignumber.js'

  const props = withDefaults(
    defineProps<{
      room?: Room
    }>(),
    {}
  )

  const betAmount = computed(() => {
    return BigNumber(props.room?.betAmount || 0)
      .div(10 ** useNetworkInfo().decimals)
      .toFormat()
  })
</script>

<template>
  <div class="animate__backInUp animate__animated animate__faster flex w-full flex-col items-center">
    <div class="" v-if="!props.room">
      <div class="relative size-20">
        <AssetEntity asset="LOBBY_TABLE" :size="80" />
      </div>
      <div class="text-12px relative mt-1 text-white">
        <div class="absolute left-1/2 -translate-x-1/2 text-nowrap">Tạo bàn</div>
      </div>
    </div>
    <div class="transition-all-150 select-none" hover="cursor-pointer scale-105" v-else>
      <div class="relative size-20">
        <AssetEntity asset="LOBBY_TABLE" :size="80" />
        <AssetEntity asset="LOBBY_PLAYER" class="absolute bottom-3 left-2" :size="20" />
        <AssetEntity asset="LOBBY_PLAYER" class="absolute bottom-3 right-2" :size="20" />
        <AssetEntity
          v-if="props.room.requiredPassword"
          asset="LOBBY_LOCKED"
          class="absolute right-1 top-1 rotate-[-15deg] shadow-sm"
          :size="20"
        />
        <!-- <div class="lobby-item-status" :class="true ? 'playing' : 'waiting'"></div> -->
        <div class="absolute left-1/2 top-[12px] flex -translate-x-1/2">
          <span class="text-12px text-gray-8 text-nowrap leading-3">{{ betAmount }}{{ useNetworkInfo().symbol }}</span>
        </div>
        <div class="absolute bottom-3 left-1/2 -translate-x-1/2">
          <icon icon="twemoji:crossed-swords" height="18" />
        </div>
      </div>
      <div class="text-12px relative mt-1 leading-4 text-white">
        <div class="w-26 absolute left-1/2 -translate-x-1/2 text-wrap text-center">{{ props.room.customName }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .lobby-item-status {
    @apply absolute right-3 top-2 flex size-2 items-center justify-center rounded-full shadow;
    &.waiting {
      background: #ccc;
      box-shadow: 2px 1px 3px 0 #0a0b0d;
    }
    &.playing {
      background: #3bbf46;
      box-shadow: 2px 1px 3px 0 #0a0b0d;
    }
  }
</style>
