<script lang="ts" setup>
  import SelectionScreen from '../components/SelectionScreen.vue'
  import type { UtxoObject } from '../interfaces'
  import { RpsGame } from '../resources/rps'
  import { useRpsStore } from '../stores/rpsStore'

  const rpsStore = useRpsStore()

  const route = useRoute()
  const nodeId = ref(route.query.node as string)

  const utxo = ref<UtxoObject>({
    'b79aa9deb5d8aac845fdcea12a6ad175e5393e7a15fdc0a27604f0e7d384e318#1': {
      address:
        'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0',
      datum: null,
      datumhash: null,
      inlineDatum: null,
      referenceScript: null,
      value: {
        lovelace: 4822707
      }
    }
  })

  const player1 = reactive(new RpsGame.Player('player1'))
  const player2 = reactive(new RpsGame.Player('player2'))
  const game = ref<RpsGame.Game | null>(null)

  const refGameContainer = ref<HTMLCanvasElement | null>(null)

  onMounted(() => {
    if (!refGameContainer.value) {
      return
    }
    game.value = new RpsGame.Game(player1, player2)
    game.value.onRoundFinished = round => {
      console.log('>>> / file: RockPapperScissors.vue:30 / onFinishRound:', round)
      const result = document.getElementById('round-result')
      if (result) {
        result.innerHTML = round.winnerMessage
      }
    }
  })

  watchEffect(() => {
    console.log('>>> / file: RockPapperScissors.vue:30 / watchEffect:', game)
  })

  const startGame = () => {
    console.log('>>> / file: RockPapperScissors.vue:34 / startGame')
    game.value?.startRound()
  }

  const resetGame = () => {
    console.log('>>> / file: RockPapperScissors.vue:39 / resetGame')
    game.value?.reset()
  }

  const youFire = (move: RpsGame.GameMove) => {
    console.log('>>> / file: RockPapperScissors.vue:39 / youFire / move:', move)
    game.value?.player1?.move(move)
  }

  const enemyFire = (move: RpsGame.GameMove) => {
    console.log('>>> / file: RockPapperScissors.vue:44 / enemyFire / move:', move)
    game.value?.player2?.move(move)
  }

  const player1CanMove = computed(
    () => game.value?.currentRound?.state === 'playing' && !game.value?.currentRound?.player1Move
  )
  const player2CanMove = computed(
    () => game.value?.currentRound?.state === 'playing' && !game.value?.currentRound?.player2Move
  )
  const roundResult = computed(() => game.value?.currentRound?.winnerMessage)

  const getMoveName = (move: RpsGame.GameMove | null) => {
    switch (move) {
      case RpsGame.GameMove.ROCK:
        return 'Búa'
      case RpsGame.GameMove.PAPER:
        return 'Bao'
      case RpsGame.GameMove.SCISSORS:
        return 'Kéo'
      default:
        return ''
    }
  }
</script>

<template>
  <div class="p-4">
    <div class="" v-if="game">
      <a-button @click="startGame">Start round</a-button>
      <a-button @click="resetGame">Reset</a-button>
      <div class="">
        TIME:
        {{ game.currentRound?.currentRoundTiming }}
      </div>
      <div class="">
        ROUND:
        {{ game.currentRound?.id }}
      </div>
      <div class="flex w-full justify-between" v-if="game.currentRound">
        <div class="">
          <div class="">PLAYER 1</div>
          <a-button @click="youFire(RpsGame.GameMove.SCISSORS)" :disabled="!player1CanMove">Kéo</a-button>
          <a-button @click="youFire(RpsGame.GameMove.ROCK)" :disabled="!player1CanMove">Búa</a-button>
          <a-button @click="youFire(RpsGame.GameMove.PAPER)" :disabled="!player1CanMove">Bao</a-button>
          <div class="">MOVE : {{ getMoveName(game.currentRound.player1Move) }}</div>
        </div>
        <div class="">
          <div class="">PLAYER 2</div>
          <a-button @click="enemyFire(RpsGame.GameMove.SCISSORS)" :disabled="!player2CanMove">Kéo</a-button>
          <a-button @click="enemyFire(RpsGame.GameMove.ROCK)" :disabled="!player2CanMove">Búa</a-button>
          <a-button @click="enemyFire(RpsGame.GameMove.PAPER)" :disabled="!player2CanMove">Bao</a-button>
          <div class="">MOVE : {{ getMoveName(game.currentRound.player2Move) }}</div>
        </div>
      </div>
    </div>
    <div class="mt-6" id="round-result"></div>
    <canvas class="game-container" ref="refGameContainer"></canvas>
  </div>
</template>

<style lang="scss" scoped></style>
