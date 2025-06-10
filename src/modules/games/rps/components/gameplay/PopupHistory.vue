<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'
  import { ChoiceType, Round, RoundResult } from '../../types/game.type'
  import AssetEntity from '../AssetEntity.vue'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'
  import { Choice } from '../../types/choice.type'

  const gameStore = useGameRPSStore()
  const { currentRound, isShowPopupHistory, gameHistory, currentRoom } = storeToRefs(gameStore)

  const onClickContinue = () => {
    isShowPopupHistory.value = false
  }

  const colorScheme = {
    [RoundResult.Player1Wins]: {
      bg: '#22C55E33',
      text: '#22C55E'
    },
    [RoundResult.Player2Wins]: {
      bg: '#EF444433',
      text: '#EF4444'
    },
    [RoundResult.Draw]: {
      bg: '#F59E0B33',
      text: '#F59E0B'
    },
    [RoundResult.Timeout]: {
      bg: '#cccccc33',
      text: '#cccccc'
    }
  }

  const winCount = computed(() => {
    return gameHistory.value.filter(item => item.result === RoundResult.Player1Wins).length
  })
  const loseCount = computed(() => {
    return gameHistory.value.filter(item => item.result === RoundResult.Player2Wins).length
  })
  const drawCount = computed(() => {
    return gameHistory.value.filter(item => item.result === RoundResult.Draw).length
  })

  type AssetEntity = 'CHOICE_ROCK' | 'CHOICE_PAPER' | 'CHOICE_SCISSORS'
  const getMoveAsset = (choice: Choice | null): { asset: AssetEntity; label: string } => {
    if (choice === Choice.Rock) {
      return {
        asset: 'CHOICE_ROCK',
        label: 'Rock'
      }
    } else if (choice === Choice.Paper) {
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
            :style="{ background: colorScheme[RoundResult.Player1Wins].bg }"
          >
            <span class="font-600 mb-1 text-base" :style="{ color: colorScheme[RoundResult.Player1Wins].text }">
              {{ winCount }}
            </span>
            <span class="text-sm">Wins</span>
          </div>
          <div
            class="rounded-3 flex flex-1 flex-col items-center py-1"
            :style="{ background: colorScheme[RoundResult.Player2Wins].bg }"
          >
            <span class="font-600 mb-1 text-base" :style="{ color: colorScheme[RoundResult.Player2Wins].text }">
              {{ loseCount }}
            </span>
            <span class="text-sm">Loses</span>
          </div>
          <div
            class="rounded-3 flex flex-1 flex-col items-center py-1"
            :style="{ background: colorScheme[RoundResult.Draw].bg }"
          >
            <span class="font-600 mb-1 text-base" :style="{ color: colorScheme[RoundResult.Draw].text }">
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
              :style="{ background: colorScheme[item.result || RoundResult.Timeout].bg }"
            >
              <div class="flex items-center gap-2">
                <div class="flex rounded-full bg-white p-1">
                  <AssetEntity :asset="getMoveAsset(item.player1Choice).asset" :size="24" />
                </div>
                <span class="text-sm">vs</span>
                <div class="flex rounded-full bg-white p-1">
                  <AssetEntity :asset="getMoveAsset(item.player2Choice).asset" :size="24" />
                </div>
              </div>
              <div class="item-center flex">
                <span class="text-sm" :style="{ color: colorScheme[item.result || RoundResult.Timeout].text }">
                  {{
                    item.result === RoundResult.Player1Wins ? '+' : item.result === RoundResult.Player2Wins ? '-' : ''
                  }}
                  {{
                    BigNumber(item.result === RoundResult.Draw ? 0 : currentRoom?.betAmount || 0)
                      .div(10 ** (currentRoom?.betUnit.decimals || 0))
                      .toFormat()
                  }}
                  {{ currentRoom?.betUnit.symbol }}
                </span>
                <div class="text-gray-5 ml-2 flex items-center" v-if="true">
                  <icon icon="ic:round-access-time" height="16" />
                  <span class="ml-1 text-xs">
                    {{ useDateFormat(new Date(), 'hh:mm A') }}
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
