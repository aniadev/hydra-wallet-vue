<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../store'
  import Choice from './gameplay/Choice.vue'
  import MessagePanel from './gameplay/MessagePanel.vue'
  import PlayerAvatar from './gameplay/PlayerAvatar.vue'
  import { useGameStore } from '../../stores/gameStore'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { networkInfo } from '@/constants/chain'
  import getRepository, { RepoName } from '@/repositories'
  import type { HexcoreRepository } from '@/repositories/hexcore'
  import { message } from 'ant-design-vue'
  import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'
  import BigNumber from 'bignumber.js'
  import type { Room } from '../types'
  import {
    DatumState,
    RoundStatus,
    ChoiceType,
    type InlineDatum,
    type RevealDatum,
    RoundResult
  } from '../types/game.type'
  import { HydraHeadStatus, HydraHeadTag } from '@/lib/hydra-bridge/types/payload.type'
  import { buildSnapshotUtxoArray, getInlineDatumObj } from '../utils'
  import { hashChoice, verifyChoice } from '../utils/encrypt'
  import PopupRoundResult from './gameplay/PopupRoundResult.vue'
  import PopupExit from './gameplay/PopupExit.vue'
  import PopupHistory from './gameplay/PopupHistory.vue'
  import { clone } from 'lodash-es'

  const props = defineProps<{
    room: Room
  }>()

  const { gameAccount } = storeToRefs(useGameStore())

  const gameStore = useGameRPSStore()
  const {
    messages,
    hydraBridge,
    round,
    gameHistory,
    myTotalLovelace,
    enemyTotalLovelace,
    showPopupResult,
    mySnapshotUtxo,
    loadingConfirm,
    hydraBridgeHeadStatus
  } = storeToRefs(gameStore)
  const choice = ref<ChoiceType | ''>('')
  round.value.myAddress = gameAccount.value?.address || ''

  onMounted(async () => {
    console.log('GamePlay mounted')
    messages.value = []
    gameStore.addMessage('Welcome to Rock Paper Scissors game!', 'BOT')

    if (!hydraBridge.value) {
      console.error('HydraBridge is not found')
      return
    }
    // return
    initHydraBridge()

    // @ts-ignore
    window.enableDebugger = () => {
      document.getElementById('debugger')?.classList.remove('hidden')
      document.getElementById('debugger')?.classList.add('flex')
    }
  })

  onBeforeUnmount(() => {
    gameStore.cleanUp()
  })

  function initHydraBridge() {
    const bridge = getBridge()
    console.log(bridge)
    // Sure about hydra is initialized and ready to commit
    if (bridge.headStatus !== HydraHeadStatus.Initializing && bridge.headStatus !== HydraHeadStatus.Open) {
      gameStore.addMessage(`Waiting for hydra node to be initialized, it may take about 20s...`, 'BOT')
      bridge.waitHeadIsInitializing(40000) // 40s
    }
    bridge.events.on('onMessage', e => {
      switch (e.tag) {
        case HydraHeadTag.Greetings:
          console.log('Greetings from Hydra')
          if (e.headStatus === HydraHeadStatus.Initializing) {
            gameStore.openHydraHead()
            gameStore.updateSnapshotUtxo()
            break
          } else if (e.headStatus === HydraHeadStatus.Open) {
            gameStore.addMessage(`Hydra head is opened!`, 'BOT')
            gameStore.validateOpenedHead(e)
            break
          }
          break
        case HydraHeadTag.SnapshotConfirmed:
          console.log('Snapshot confirmed', e)
          gameStore.updateSnapshotUtxo()
          break
        case HydraHeadTag.HeadIsInitializing:
          console.log('Head is initializing', e)
          gameStore.openHydraHead()
          break
        case HydraHeadTag.HeadIsOpen:
          gameStore.addMessage(`Everything got ready, let's go!!`, 'BOT')
          gameStore.updateSnapshotUtxo()
          break
      }
    })
  }
  onBeforeUnmount(() => {
    const bridge = getBridge()
    bridge.events.off('onMessage')
  })
  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  const getEnemyAvatarStatus = computed(() => {
    if (round.value.enemyAddress) {
      if (round.value.enemyEncryptedChoice) {
        return 'selected'
      } else {
        return 'pending'
      }
    }
    return ''
  })

  const getMyAvatarStatus = computed(() => {
    if (round.value.myAddress) {
      if (round.value.myEncryptedChoice) {
        return 'selected'
      } else {
        return 'pending'
      }
    }
    return ''
  })

  const isEnableChoice = computed(() => {
    return (
      myTotalLovelace.value >= round.value.betAmount &&
      !round.value.myChoice &&
      (round.value.status === RoundStatus.IDLE || round.value.status === RoundStatus.COMMIT) &&
      hydraBridgeHeadStatus.value === HydraHeadStatus.Open
    )
  })

  async function onClickConfirm() {
    console.time('onClickConfirm')
    if (!choice.value) return
    loadingConfirm.value = true
    round.value.myChoice = choice.value
    // if (round.value.status !== RoundStatus.IDLE && round.value.status !== RoundStatus.COMMIT) return
    gameStore.handleCommit()
    console.timeEnd('onClickConfirm')
  }

  async function test() {
    console.log('Test')
    const bridge = getBridge()
    bridge.commands.init()
  }
  async function testClose() {
    console.log('Test')
    const bridge = getBridge()
    bridge.commands.close()
  }
  async function testFanout() {
    console.log('Test')
    const bridge = getBridge()
    bridge.commands.fanout()
  }
</script>

<template>
  <div class="relative flex h-full w-full flex-col p-4 text-white">
    <!-- TEST -->
    <div class="fixed right-8 top-10 hidden flex-col gap-2" id="debugger">
      <a-button type="primary" @click="test()">Init</a-button>
      <a-button type="primary" @click="testClose()">Close head</a-button>
      <a-button type="primary" @click="gameStore.startNewGame()">Reset</a-button>
      <a-button type="primary" @click="testFanout()">Fanout</a-button>
    </div>
    <!-- TEST -->
    <PopupRoundResult @continue="gameStore.startNewGame()" v-model:open="showPopupResult" />

    <div class="flex w-full flex-shrink-0 items-center justify-between">
      <div class="w-32px flex-shrink-0">
        <PopupExit>
          <div class="flex items-center hover:cursor-pointer">
            <icon icon="ic:round-keyboard-backspace" height="24" />
            <!-- <span class="ml-1 text-sm">Quit</span> -->
          </div>
        </PopupExit>
      </div>
      <div class="flex-shrink-0">
        <div class="flex items-center gap-1" v-if="gameAccount">
          <div class="flex items-center">
            <span class="text-green-4 font-500 mr-2 text-xs">
              {{
                BigNumber(myTotalLovelace)
                  .div(10 ** 6)
                  .toFormat(2)
              }}
              {{ networkInfo.symbol }}
            </span>
            <PlayerAvatar
              :size="40"
              :player-info="{ name: gameAccount?.alias, avatarUrl: gameAccount?.avatar, address: gameAccount.address }"
              :status="getMyAvatarStatus"
            />
          </div>
          <div class="">
            <!-- <span class="text-base">vs</span>  -->
            <img src="../assets/images/game-versus.png" alt="" class="size-8" />
          </div>
          <div class="flex items-center">
            <div class="rounded-2">
              <div
                class="rounded-2 border-green-2 flex size-[38px] items-center justify-center border border-solid"
                v-if="!round.enemyAddress"
              >
                <icon icon="ic:round-person-add-alt-1" height="24" />
              </div>
              <PlayerAvatar
                :status="getEnemyAvatarStatus"
                :size="40"
                v-else
                :player-info="{ name: 'Jayce', address: round.enemyAddress }"
              />
            </div>
            <span class="text-green-4 font-500 ml-2 text-xs">
              {{
                BigNumber(enemyTotalLovelace)
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
      <div class="flex items-center justify-between gap-6">
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
        class="btn-primary mt-4 w-full"
        type="primary"
        :disabled="!isEnableChoice"
        :loading="loadingConfirm"
        @click="onClickConfirm()"
      >
        Confirm
      </a-button>
      <a-input class="mt-4 w-full" size="large" placeholder="Type message...">
        <template #suffix>
          <icon icon="tabler:send" height="20" class="text-gray-4" />
        </template>
      </a-input>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
