<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../rps/store'
  import AssetEntity from '../rps/components/AssetEntity.vue'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'
  import { ChoiceType } from '../rps/types/game.type'

  const showModal = defineModel('open', { type: Boolean })
  const { round } = storeToRefs(useGameRPSStore())

  const emits = defineEmits<{
    continue: []
    exit: []
  }>()

  const title = computed(() => {
    if (round.value.result === 'win') return 'You Win!'
    if (round.value.result === 'lose') return 'You Lose'
    return `It's a Tie`
  })

  const colorScheme = computed(() => {
    if (round.value.result === 'win') return '#20AD49'
    if (round.value.result === 'lose') return '#F42424'
    return '#F59E0B'
  })

  const asset = computed(() => {
    if (round.value.result === 'win') return 'RESULT_WIN'
    if (round.value.result === 'lose') return 'RESULT_LOSE'
    return 'RESULT_TIE'
  })

  const message = computed(() => {
    const amount = BigNumber(round.value.betAmount)
      .div(10 ** networkInfo.decimals)
      .toFormat()
    if (round.value.result === 'win') return `You won ${amount} ${networkInfo.symbol}`
    if (round.value.result === 'lose') return `You lost ${amount} ${networkInfo.symbol}`
    return `You won 0 ADA`
  })

  type AssetEntity = 'CHOICE_ROCK' | 'CHOICE_PAPER' | 'CHOICE_SCISSORS'
  const getMoveAsset = (choice: ChoiceType): { asset: AssetEntity; label: string } => {
    if (choice === ChoiceType.ROCK) {
      return {
        asset: 'CHOICE_ROCK',
        label: 'Rock'
      }
    } else if (choice === ChoiceType.PAPER) {
      return {
        asset: 'CHOICE_PAPER',
        label: 'Paper'
      }
    } else {
      return {
        asset: 'CHOICE_SCISSORS',
        label: 'Scissors'
      }
    }
  }
</script>

<template>
  <a-modal v-model:open="showModal" width="450px" title="" centered :closable="false" :mask-closable="false">
    <div class="" :style="{ '--color-scheme': colorScheme, color: colorScheme }">
      <div class="flex flex-col items-center justify-center">
        <div class="text-4xl font-semibold">
          {{ title }}
        </div>
        <div class="mt-4">
          <div class="flex justify-center">
            <AssetEntity :asset class="size-21" />
          </div>
          <div class="mt-4 text-center text-base">{{ message }}</div>
        </div>
        <div class="mt-6 flex items-center justify-center gap-10" v-if="round.myChoice && round.enemyChoice">
          <div class="flex w-20 flex-col items-center overflow-visible">
            <div class="text-gray-9 text-nowrap text-sm">Your move</div>
            <div class="relative mt-1 flex size-20 flex-col items-center justify-center">
              <div class="rounded-3 op-20 absolute inset-0" :style="{ background: 'var(--color-scheme)' }"></div>
              <AssetEntity :asset="getMoveAsset(round.myChoice).asset" class="size-6" />
              <div class="">{{ getMoveAsset(round.myChoice).label }}</div>
            </div>
          </div>
          <div class="flex w-20 flex-col items-center overflow-visible">
            <div class="text-gray-9 text-nowrap text-sm">Opponent move</div>
            <div class="relative mt-1 flex size-20 flex-col items-center justify-center">
              <div class="rounded-3 op-20 absolute inset-0" :style="{ background: 'var(--color-scheme)' }"></div>
              <AssetEntity :asset="getMoveAsset(round.enemyChoice).asset" class="size-6" />
              <div class="">{{ getMoveAsset(round.enemyChoice).label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <a-row :gap="0" :gutter="16">
        <a-col :span="8">
          <a-button class="btn-tertiary w-full" type="primary" size="large" @click="emits('exit')"> Exit </a-button>
        </a-col>
        <a-col :span="16">
          <a-button class="btn-primary w-full" type="primary" size="large" @click="emits('continue')">
            Play Again
          </a-button>
        </a-col>
      </a-row>
    </template>
  </a-modal>
</template>

<style lang="scss" scoped></style>
