<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'
  import Choice from '../gameplay/Choice.vue'
  import MessagePanel from '../gameplay/MessagePanel.vue'
  import PlayerAvatar from '../gameplay/PlayerAvatar.vue'
  import { useGameAuthStore } from '../../../stores/gameAuthStore'
  import { networkInfo } from '@/constants/chain'
  import BigNumber from 'bignumber.js'
  import type { Room } from '../../types'
  import { DatumState, RoundStatus, ChoiceType, type RevealDatum, RoundResult } from '../../types/game.type'
  import { HydraHeadStatus, HydraHeadTag } from '@/lib/hydra-bridge/types/payload.type'
  import PopupRoundResult from '../gameplay/PopupRoundResult.vue'
  import PopupExit from '../gameplay/PopupExit.vue'
  import PopupHistory from '../gameplay/PopupHistory.vue'

  const props = defineProps<{
    room: Room
  }>()

  const { gameAccount } = storeToRefs(useGameAuthStore())

  const gameStore = useGameRPSStore()
  const choice = ref<ChoiceType | ''>('')
  const { showPopupResult, networkConnected, loadingConfirm, playerA, playerB } = storeToRefs(gameStore)

  onMounted(async () => {
    console.log('GamePlay mounted')

    // @ts-ignore
    window.enableDebugger = () => {
      document.getElementById('debugger')?.classList.remove('hidden')
      document.getElementById('debugger')?.classList.add('flex')
    }
  })

  onBeforeUnmount(() => {
    //
  })

  onBeforeUnmount(() => {
    //
  })
  const getEnemyAvatarStatus = computed(() => {
    // if (round.value.enemyAddress) {
    //   if (round.value.enemyEncryptedChoice) {
    //     return 'selected'
    //   } else {
    //     return 'pending'
    //   }
    // }
    return ''
  })

  const getMyAvatarStatus = computed(() => {
    // if (round.value.myAddress) {
    //   if (round.value.myEncryptedChoice) {
    //     return 'selected'
    //   } else {
    //     return 'pending'
    //   }
    // }
    return ''
  })

  const isEnableChoice = computed(() => {
    return (
      // myTotalLovelace.value >= round.value.betAmount &&
      // !round.value.myChoice &&
      // (round.value.status === RoundStatus.IDLE || round.value.status === RoundStatus.COMMIT) &&
      // hydraBridgeHeadStatus.value === HydraHeadStatus.Open
      false
    )
  })

  async function onClickConfirm() {
    //
  }

  async function test() {
    console.log('Test')
  }
  async function testClose() {
    console.log('Test close')
  }
  async function testFanout() {
    console.log('Test fanout')
  }
</script>

<template>
  <div class="relative flex h-full w-full flex-col p-4 text-white">
    <!-- TEST -->
    <div class="fixed right-8 top-10 hidden flex-col gap-2" id="debugger">
      <a-button type="primary" @click="test()">Init</a-button>
      <a-button type="primary" @click="testClose()">Close head</a-button>
      <a-button type="primary" @click="null">Reset</a-button>
      <a-button type="primary" @click="testFanout()">Fanout</a-button>
    </div>
    <!-- TEST -->
    <PopupRoundResult @continue="null" v-model:open="showPopupResult" />

    <div class="flex w-full flex-shrink-0 items-center justify-between">
      <div class="w-32px flex-shrink-0">
        <PopupExit>
          <div class="flex items-center hover:cursor-pointer">
            <icon icon="ic:round-keyboard-backspace" height="24" />
          </div>
        </PopupExit>
      </div>
      <div class="flex-shrink-0">
        <div class="flex items-center gap-1" v-if="gameAccount">
          <div class="flex items-center">
            <span class="text-green-4 font-500 mr-2 text-xs">
              {{
                BigNumber('0')
                  .div(10 ** 6)
                  .toFormat(2)
              }}
              {{ networkInfo.symbol }}
            </span>
            <PlayerAvatar
              :size="40"
              :player-info="{
                name: gameAccount?.alias,
                avatarUrl: gameAccount?.avatar,
                address: gameAccount.walletAddress
              }"
              :status="getMyAvatarStatus"
            />
          </div>
          <div class="">
            <!-- <span class="text-base">vs</span>  -->
            <img src="../../assets/images/game-versus.png" alt="game-vs" class="size-8" />
          </div>
          <div class="flex items-center">
            <div class="rounded-2">
              <div
                class="rounded-2 border-green-2 flex size-[38px] items-center justify-center border border-solid"
                v-if="!playerB.id"
              >
                <icon icon="ic:round-person-add-alt-1" height="24" />
              </div>
              <PlayerAvatar
                :status="getEnemyAvatarStatus"
                :size="40"
                v-else
                :player-info="{ name: 'Jayce', address: '---' }"
              />
            </div>
            <span class="text-green-4 font-500 ml-2 text-xs">
              {{
                BigNumber('0')
                  .div(10 ** 6)
                  .toFormat(2)
              }}
              {{ networkInfo.symbol }}
            </span>
          </div>
        </div>
      </div>
      <div class="w-32px flex-shrink-0">
        <PopupHistory />
      </div>
    </div>
    <div class="flex-grow-1 my-4 overflow-y-hidden">
      <MessagePanel />
    </div>
    <div class="flex-shrink-0">
      <a-input class="w-full" size="large" placeholder="Type message...">
        <template #suffix>
          <icon icon="tabler:send" height="20" class="text-gray-4" />
        </template>
      </a-input>
      <div class="mt-4 flex items-center justify-between gap-6">
        <div class="flex-1">
          <Choice
            type="ROCK"
            :disabled="!isEnableChoice"
            @click="choice = ChoiceType.ROCK"
            :active="choice === ChoiceType.ROCK"
          />
        </div>
        <div class="flex-1">
          <Choice
            type="PAPER"
            :disabled="!isEnableChoice"
            @click="choice = ChoiceType.PAPER"
            :active="choice === ChoiceType.PAPER"
          />
        </div>
        <div class="flex-1">
          <Choice
            type="SCISSORS"
            :disabled="!isEnableChoice"
            @click="choice = ChoiceType.SCISSORS"
            :active="choice === ChoiceType.SCISSORS"
          />
        </div>
      </div>
      <a-button
        class="btn-primary mt-4 !h-[64px] w-full"
        type="primary"
        :disabled="!isEnableChoice"
        :loading="loadingConfirm"
        @click="onClickConfirm()"
      >
        <span class="font-600 text-lg">Confirm</span>
      </a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
