<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'
  import { RoundResult } from '../../types/game.type'
  import AssetEntity from '../AssetEntity.vue'
  import { CurrencyBalance } from '../../types/currency.type'
  import { Choice } from '../../types/choice.type'
  import { useGameAuthStore } from '../../../stores/gameAuthStore'

  const showModal = defineModel('open', { type: Boolean })
  const { currentRoom, currentRound } = storeToRefs(useGameRPSStore())
  const gameAuthStore = useGameAuthStore()

  const emits = defineEmits<{
    continue: []
    exit: []
  }>()

  const roundResult = computed<'WIN' | 'LOSE' | 'DRAW'>(() => {
    if (!currentRound.value) return 'DRAW'
    const myAddress = gameAuthStore.gameAccount?.walletAddress

    const { playerA, playerB } = currentRound.value

    let result: 'WIN' | 'LOSE' | 'DRAW' = 'DRAW'
    if (playerA.choice === playerB.choice) {
      result = 'DRAW'
    } else if (playerA.choice === Choice.Rock && playerB.choice === Choice.Scissors) {
      result = 'WIN'
    } else if (playerA.choice === Choice.Paper && playerB.choice === Choice.Rock) {
      result = 'WIN'
    } else if (playerA.choice === Choice.Scissors && playerB.choice === Choice.Paper) {
      result = 'WIN'
    } else {
      result = 'LOSE'
    }

    if (myAddress === playerA.id) {
      return result
    } else {
      return result === 'WIN' ? 'LOSE' : result === 'LOSE' ? 'WIN' : 'DRAW'
    }
  })

  const title = computed(() => {
    if (roundResult.value === 'WIN') return 'You Win!'
    else if (roundResult.value === 'LOSE') return 'You Lose'
    else return `It's a Tie`
  })

  const colorScheme = computed(() => {
    if (roundResult.value === 'WIN') return '#20AD49'
    else if (roundResult.value === 'LOSE') return '#F42424'
    else return '#F59E0B'
  })

  const asset = computed(() => {
    if (roundResult.value === 'WIN') return 'RESULT_WIN'
    else if (roundResult.value === 'LOSE') return 'RESULT_LOSE'
    else return 'RESULT_TIE'
  })

  const message = computed(() => {
    if (!currentRoom.value) return ''
    const amount = new CurrencyBalance(currentRoom.value.betUnit, currentRoom.value.betAmount).toAda(true)
    if (roundResult.value === 'WIN') return `You won ${amount}`
    else if (roundResult.value === 'LOSE') return `You lost ${amount}`
    else return `You won 0 ADA`
  })

  type AssetEntity = 'CHOICE_ROCK' | 'CHOICE_PAPER' | 'CHOICE_SCISSORS'
  const getMoveAsset = (choice: Choice): { asset: AssetEntity; label: string } => {
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

  const onClickContinue = () => {
    emits('continue')
    showModal.value = false
  }
</script>

<template>
  <a-modal v-model:open="showModal" width="420px" title="" centered :closable="false" :mask-closable="false">
    <div class="" :style="{ '--color-scheme': colorScheme, color: colorScheme }">
      <div class="flex flex-col items-center justify-center">
        <div class="text-4xl font-semibold">
          {{ title }}
        </div>
        <div class="mt-4">
          <div class="flex justify-center">
            <AssetEntity :asset :size="84" />
          </div>
          <div class="mt-4 text-center text-base">{{ message }}</div>
        </div>
        <div
          class="mt-6 flex items-center justify-center gap-10"
          v-if="currentRound?.playerA.choice && currentRound?.playerB.choice"
        >
          <div class="flex w-20 flex-col items-center overflow-visible">
            <div class="text-gray-9 text-nowrap text-sm">Your move</div>
            <div class="relative mt-1 flex size-20 flex-col items-center justify-center">
              <div class="rounded-3 op-20 absolute inset-0" :style="{ background: 'var(--color-scheme)' }"></div>
              <AssetEntity :asset="getMoveAsset(currentRound.playerA.choice).asset" class="size-6" />
              <div class="">{{ getMoveAsset(currentRound.playerA.choice).label }}</div>
            </div>
          </div>
          <div class="flex w-20 flex-col items-center overflow-visible">
            <div class="text-gray-9 text-nowrap text-sm">Opponent move</div>
            <div class="relative mt-1 flex size-20 flex-col items-center justify-center">
              <div class="rounded-3 op-20 absolute inset-0" :style="{ background: 'var(--color-scheme)' }"></div>
              <AssetEntity :asset="getMoveAsset(currentRound.playerB.choice).asset" class="size-6" />
              <div class="">{{ getMoveAsset(currentRound.playerB.choice).label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <a-row :gap="0" :gutter="16">
        <!-- <a-col :span="8">
          <a-button class="btn-tertiary w-full" type="primary" size="large" @click="emits('exit')"> Exit </a-button>
        </a-col> -->
        <a-col :span="24">
          <a-button
            class="btn-primary animate__pulse animate__animated animate__infinite w-full"
            type="primary"
            size="large"
            @click="onClickContinue()"
          >
            Play Again
          </a-button>
        </a-col>
      </a-row>
    </template>
  </a-modal>
</template>

<style lang="scss" scoped></style>
