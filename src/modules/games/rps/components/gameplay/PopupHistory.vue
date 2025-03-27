<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store'
  import { ChoiceType, Round, RoundResult } from '../../types/game.type'
  import AssetEntity from '../AssetEntity.vue'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'

  const gameStore = useGameRPSStore()
  const { round, isShowPopupHistory, gameHistory } = storeToRefs(gameStore)

  const onClickContinue = () => {
    isShowPopupHistory.value = false
  }

  const colorScheme = {
    [RoundResult.WIN]: {
      bg: '#22C55E33',
      text: '#22C55E'
    },
    [RoundResult.LOSE]: {
      bg: '#EF444433',
      text: '#EF4444'
    },
    [RoundResult.DRAW]: {
      bg: '#F59E0B33',
      text: '#F59E0B'
    },
    [RoundResult.UNKNOWN]: {
      bg: '#cccccc33',
      text: '#cccccc'
    }
  }

  const winCount = computed(() => {
    return gameHistory.value.filter(item => item.result === RoundResult.WIN).length
  })
  const loseCount = computed(() => {
    return gameHistory.value.filter(item => item.result === RoundResult.LOSE).length
  })
  const drawCount = computed(() => {
    return gameHistory.value.filter(item => item.result === RoundResult.DRAW).length
  })

  type AssetEntity = 'CHOICE_ROCK' | 'CHOICE_PAPER' | 'CHOICE_SCISSORS'
  const getMoveAsset = (choice: ChoiceType | ''): { asset: AssetEntity; label: string } => {
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
  <div class="">
    <a-modal v-model:open="isShowPopupHistory" :footer="false" width="410px" title="" centered>
      <div class="flex flex-col items-center justify-center">
        <div class="flex w-full items-center">
          <icon icon="material-symbols:history" height="24" />
          <span class="ml-1 text-sm">Game History</span>
        </div>
        <div class="mt-4 flex w-full items-center justify-between gap-3">
          <div
            class="rounded-3 flex flex-1 flex-col items-center py-1"
            :style="{ background: colorScheme[RoundResult.WIN].bg }"
          >
            <span class="font-600 mb-1 text-base" :style="{ color: colorScheme[RoundResult.WIN].text }">
              {{ winCount }}
            </span>
            <span class="text-sm">Wins</span>
          </div>
          <div
            class="rounded-3 flex flex-1 flex-col items-center py-1"
            :style="{ background: colorScheme[RoundResult.LOSE].bg }"
          >
            <span class="font-600 mb-1 text-base" :style="{ color: colorScheme[RoundResult.LOSE].text }">
              {{ loseCount }}
            </span>
            <span class="text-sm">Loses</span>
          </div>
          <div
            class="rounded-3 flex flex-1 flex-col items-center py-1"
            :style="{ background: colorScheme[RoundResult.DRAW].bg }"
          >
            <span class="font-600 mb-1 text-base" :style="{ color: colorScheme[RoundResult.DRAW].text }">
              {{ drawCount }}
            </span>
            <span class="text-sm">Ties</span>
          </div>
        </div>
        <div class="max-h-260px scroll-bar-hidden mt-6 w-full overflow-y-auto">
          <ul class="m-0 w-full p-0">
            <li
              v-for="item in gameHistory"
              :key="item.id"
              class="rounded-3 mb-3 flex w-full items-center justify-between p-2 last:mb-0"
              :style="{ background: colorScheme[item.result].bg }"
            >
              <div class="flex items-center gap-2">
                <div class="flex rounded-full bg-white p-1">
                  <AssetEntity :asset="getMoveAsset(item.myChoice).asset" :size="24" />
                </div>
                <span class="text-sm">vs</span>
                <div class="flex rounded-full bg-white p-1">
                  <AssetEntity :asset="getMoveAsset(item.enemyChoice).asset" :size="24" />
                </div>
              </div>
              <div class="item-center flex">
                <span class="text-sm" :style="{ color: colorScheme[item.result].text }">
                  {{ item.result === RoundResult.WIN ? '+' : item.result === RoundResult.LOSE ? '-' : '' }}
                  {{
                    BigNumber(item.result === RoundResult.DRAW ? 0 : item.betAmount)
                      .div(10 ** networkInfo.decimals)
                      .toFormat()
                  }}
                  {{ networkInfo.symbol }}
                </span>
                <div class="text-gray-5 ml-2 flex items-center" v-if="item.enemyRevealDatum?.t">
                  <icon icon="ic:round-access-time" height="16" />
                  <span class="ml-1 text-xs">
                    {{ useDateFormat(item.enemyRevealDatum.t, 'hh:mm A') }}
                  </span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </a-modal>
    <div class="flex items-center justify-end hover:cursor-pointer" @click="isShowPopupHistory = true">
      <icon icon="material-symbols:history" height="24" />
      <!-- <span class="ml-1 text-sm">History</span> -->
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
