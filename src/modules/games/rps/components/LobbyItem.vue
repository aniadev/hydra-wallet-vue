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
    <div class="" v-else>
      <div class="relative size-20">
        <AssetEntity asset="LOBBY_TABLE" :size="80" />
        <AssetEntity asset="LOBBY_PLAYER" class="absolute bottom-3 left-2" :size="20" v-if="room?.party.length === 1" />
        <AssetEntity
          asset="LOBBY_PLAYER"
          class="absolute bottom-3 right-2"
          :size="20"
          v-if="room?.party.length === 2"
        />
        <div class="absolute left-1/2 top-[12px] flex -translate-x-1/2">
          <span class="text-12px text-gray-8 text-nowrap leading-3">{{ betAmount }}{{ useNetworkInfo().symbol }}</span>
        </div>
      </div>
      <div class="text-12px relative mt-1 text-white">
        <div class="absolute left-1/2 -translate-x-1/2 text-nowrap">{{ props.room.name }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
