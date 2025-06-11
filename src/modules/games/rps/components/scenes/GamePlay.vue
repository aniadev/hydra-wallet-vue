<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useGameRPSStore } from '../../store/game.store'
  import ChoiceItem from '../gameplay/Choice.vue'
  import MessagePanel from '../gameplay/MessagePanel.vue'
  import PlayerAvatar from '../gameplay/PlayerAvatar.vue'
  import { useGameAuthStore } from '../../../stores/gameAuthStore'
  import { networkInfo } from '@/constants/chain'
  import BigNumber from 'bignumber.js'
  import type { GamePlayer, Room } from '../../types'
  import { DatumState, RoundStatus, type RevealDatum, RoundResult, GameState } from '../../types/game.type'
  import { HydraHeadStatus, HydraHeadTag } from '@/lib/hydra-bridge/types/payload.type'
  import PopupRoundResult from '../gameplay/PopupRoundResult.vue'
  import PopupExit from '../gameplay/PopupExit.vue'
  import PopupHistory from '../gameplay/PopupHistory.vue'
  import PopupInvitePlayer from '../PopupInvitePlayer.vue'
  import { Choice } from '../../types/choice.type'
  import { hashChoice } from '../../utils/encrypt'

  const props = defineProps<{
    room: Room
  }>()

  const { gameAccount } = storeToRefs(useGameAuthStore())

  const gameRPSStore = useGameRPSStore()
  const choice = ref<Choice>(Choice.None)
  const saltChoice = ref<string>('')

  const {
    showPopupResult,
    isShowPopupInvite,
    networkConnected,
    loadingConfirm,
    playerA,
    playerB,
    userA,
    userB,
    socketRoom,
    currentRoom
  } = storeToRefs(gameRPSStore)

  const gameState = ref<GameState>(GameState.WaitingForNextRound)

  onMounted(async () => {
    console.log('GamePlay mounted')

    gameRPSStore.gameSocketClient.listen('GAME_STATE_CHANGED', payload => {
      const { state, oldState, players, currentRound } = payload.data
      console.log(`[GamePlayManager][handleSocketEventGameStateChange]: | ${state} | `, payload)
      updatePlayerData(players)
      gameState.value = state
    })

    // @ts-ignore
    window.enableDebugger = () => {
      document.getElementById('debugger')?.classList.remove('hidden')
      document.getElementById('debugger')?.classList.add('flex')
    }
  })

  watch(gameState, () => {
    console.log('[GAME][game_state_changed]', gameState.value)
    switch (gameState.value) {
      case GameState.WaitingForNextRound: {
        primaryBtnType.value = 'READY'
        isDisabledPrimaryBtn.value = false
        isDisabledChoiceBtn.value = true
        gameRPSStore.resetPlayerChoice(playerA.value)
        gameRPSStore.resetPlayerChoice(playerB.value)
        saltChoice.value = ''
        break
      }
      case GameState.WaitingForPlayers: {
        primaryBtnType.value = 'READY'
        isDisabledPrimaryBtn.value = !!playerA.value.isReady
        isDisabledChoiceBtn.value = true
        break
      }
      case GameState.WaitingForChoices: {
        const hasMadeChoice = choice.value !== Choice.None && !!playerA.value.commit
        primaryBtnType.value = 'CONFIRM'
        isDisabledPrimaryBtn.value = hasMadeChoice ? true : false
        isDisabledChoiceBtn.value = hasMadeChoice ? true : false

        startCountdown(60_000)
        break
      }
      case GameState.CommittingChoices: {
        primaryBtnType.value = 'CONFIRM'
        const hasMadeChoice = choice.value !== Choice.None && !!playerA.value.commit
        isDisabledPrimaryBtn.value = hasMadeChoice ? true : false
        isDisabledChoiceBtn.value = hasMadeChoice ? true : false
        break
      }
      case GameState.RevealingChoices: {
        isDisabledPrimaryBtn.value = true
        isDisabledChoiceBtn.value = true

        gameRPSStore.gameSocketClient.emit('GAME', {
          action: 'REVEAL',
          socketRoom: socketRoom.value,
          gameRoomId: currentRoom.value!.id,
          data: {
            txId: 'tx_id_reveal_from_client_test_' + choice.value,
            choice: choice.value,
            salt: saltChoice.value
          }
        })
        break
      }
      case GameState.WaitingForPayout:
        break
      case GameState.ShowRoundResult: {
        isDisabledPrimaryBtn.value = true
        isDisabledChoiceBtn.value = true
        showPopupResult.value = true
        break
      }
    }
  })

  function updatePlayerData(players: GamePlayer[]) {
    for (const player of players) {
      if (player.id === userA.value?.walletAddress) {
        playerA.value = player
      }
      if (player.id === userB.value?.walletAddress) {
        playerB.value = player
      }
    }
  }

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

  const isDisabledChoiceBtn = ref(true)
  const isDisabledPrimaryBtn = ref(false)
  const primaryBtnType = ref<'READY' | 'CONFIRM' | 'WAITING_ENEMY'>('READY')
  async function onClickPrimaryBtn() {
    if (primaryBtnType.value === 'READY') {
      gameRPSStore.gameSocketClient.emit('GAME', {
        action: 'READY',
        socketRoom: socketRoom.value,
        gameRoomId: currentRoom.value!.id
      })
    } else if (primaryBtnType.value === 'CONFIRM') {
      if (!choice.value) return
      const { choice: raw, salt, encrypted } = hashChoice(choice.value)
      saltChoice.value = salt
      console.log('>>> / raw, salt, encrypted:', raw, salt, encrypted)
      // TODO: submit to hydra and get txId
      // playerA.value.commit = {
      //   txId: '0x123',
      //   encryptedChoice: encrypted
      // }
      gameRPSStore.gameSocketClient.emit('GAME', {
        action: 'COMMIT',
        socketRoom: socketRoom.value,
        gameRoomId: currentRoom.value!.id,
        data: {
          encryptedChoice: encrypted,
          txId: '0x123'
        }
      })
    }
  }

  function onClickChoice(_choice: Choice) {
    choice.value = _choice
  }

  //
  const countdown = reactive({
    isRunning: false,
    duration: 60_000,
    remaining: 60_000,
    interval: null as NodeJS.Timeout | null
  })

  const startCountdown = (duration: number) => {
    countdown.isRunning = true
    countdown.duration = duration
    countdown.remaining = duration
    countdown.interval = setInterval(() => {
      countdown.remaining -= 1_000
      if (countdown.remaining <= 0) {
        clearInterval(countdown.interval!)
        countdown.remaining = 0
        countdown.isRunning = false
      }
    }, 1_000)
  }

  const stopCountdown = () => {
    countdown.isRunning = false
    clearInterval(countdown.interval!)
    countdown.remaining = 0
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
    <PopupInvitePlayer v-model:open="isShowPopupInvite" />

    <div class="flex w-full flex-shrink-0 items-center justify-between">
      <div class="w-32px flex-shrink-0">
        <PopupExit v-if="gameState === GameState.WaitingForNextRound">
          <div class="flex items-center hover:cursor-pointer">
            <icon icon="ic:round-keyboard-backspace" height="24" />
          </div>
        </PopupExit>
      </div>
      <div class="flex-shrink-0">
        <div class="flex items-center gap-1">
          <div class="flex flex-col items-end pt-2">
            <div class="flex items-center">
              <div class="mr-2 flex flex-col items-end">
                <span class="text-xs">{{ userA?.alias }}</span>
                <span class="text-green-4 font-500 text-xs">
                  {{
                    BigNumber('0')
                      .div(10 ** 6)
                      .toFormat(2)
                  }}
                  {{ networkInfo.symbol }}
                </span>
              </div>
              <PlayerAvatar
                :size="40"
                :player-info="{
                  name: userA?.alias,
                  avatarUrl: userA?.avatar,
                  address: userA?.walletAddress || ''
                }"
                :status="getMyAvatarStatus"
              />
            </div>
            <span class="text-10px text-green-2 mr-20px translate-x-1/2 leading-3">
              {{ playerA.isReady ? 'Ready' : 'Waiting' }}
            </span>
          </div>
          <div class="">
            <!-- <span class="text-base">vs</span>  -->
            <img src="../../assets/images/game-versus.png" alt="game-vs" class="size-8" />
          </div>
          <div class="flex flex-col items-start pt-2">
            <div class="flex items-center">
              <div class="rounded-2">
                <div
                  class="rounded-2 border-green-2 flex size-[38px] items-center justify-center border border-solid"
                  @click="isShowPopupInvite = true"
                  v-if="!userB"
                >
                  <icon icon="ic:round-person-add-alt-1" height="24" />
                </div>
                <PlayerAvatar
                  :status="getEnemyAvatarStatus"
                  :size="40"
                  v-else
                  :player-info="{
                    name: userB?.alias,
                    avatarUrl: userB?.avatar,
                    address: userB?.walletAddress || ''
                  }"
                />
              </div>
              <div class="ml-2 flex flex-col items-start">
                <span class="text-xs">{{ userB?.alias }}</span>
                <span class="text-green-4 font-500 text-xs">
                  {{
                    BigNumber('0')
                      .div(10 ** 6)
                      .toFormat(2)
                  }}
                  {{ networkInfo.symbol }}
                </span>
              </div>
            </div>
            <div class="text-10px text-green-2 ml-20px -translate-x-1/2 leading-3">
              {{ playerB.isReady ? 'Ready' : 'Waiting' }}
            </div>
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
          <ChoiceItem
            type="ROCK"
            :disabled="isDisabledChoiceBtn"
            :active="choice === Choice.Rock"
            @click="onClickChoice(Choice.Rock)"
          />
        </div>
        <div class="flex-1">
          <ChoiceItem
            type="PAPER"
            :disabled="isDisabledChoiceBtn"
            :active="choice === Choice.Paper"
            @click="onClickChoice(Choice.Paper)"
          />
        </div>
        <div class="flex-1">
          <ChoiceItem
            type="SCISSORS"
            :disabled="isDisabledChoiceBtn"
            :active="choice === Choice.Scissors"
            @click="onClickChoice(Choice.Scissors)"
          />
        </div>
      </div>
      <a-button
        class="btn-primary mt-4 !h-[64px] w-full"
        type="primary"
        :disabled="isDisabledPrimaryBtn"
        :loading="loadingConfirm"
        @click="onClickPrimaryBtn()"
      >
        <span class="font-600 text-lg"
          >{{ primaryBtnType === 'READY' ? 'Ready' : primaryBtnType === 'CONFIRM' ? 'Confirm' : 'Waiting for enemy' }}
          {{ countdown.isRunning ? `(${Math.floor(countdown.remaining / 1000)}s)` : '' }}
        </span>
      </a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
