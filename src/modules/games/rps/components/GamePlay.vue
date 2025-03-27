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
  const { messages, hydraBridge, round, gameHistory } = storeToRefs(gameStore)
  const choice = ref<ChoiceType | ''>('')
  const hexcoreApi = getRepository(RepoName.Hexcore) as HexcoreRepository

  const auth = useAuthV2()
  const addressUtxo = ref<{ txId: string; txIndex: number; utxo: UTxOObjectValue }[]>([])
  round.value.myAddress = gameAccount.value?.address || ''
  const showPopupResult = ref(false)

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
  })

  onBeforeUnmount(() => {
    gameStore.cleanUp()
  })

  async function openHydraHead() {
    const bridge = getBridge()
    // Init account
    const { rootKey } = auth
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }
    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })
    if (!gameAccount.value) {
      console.error('Game account is not found')
      return
    }
    const rs = await hexcoreApi.getUtxo(gameAccount.value.address)
    addressUtxo.value = Object.keys(rs.data).map(txHash => {
      const [txId, txIndex] = txHash.split('#')
      return {
        txId,
        txIndex: +txIndex,
        utxo: rs.data[txHash as TxHash]
      }
    })
    const totalLovelace = addressUtxo.value.reduce((acc, { utxo }) => acc + utxo.value.lovelace, 0)
    const totalBalance = BigNumber(totalLovelace).dividedBy(1_000_000).toFormat() + ' ' + useNetworkInfo().symbol
    gameStore.addMessage('Your account is ready!', 'BOT')
    gameStore.addMessage(`UTxOs: ${addressUtxo.value.length} | Total balance: ${totalBalance}`, 'BOT')
    // Auto select utxos to commit into head, from minimum to maximum
    // Only select utxos without NFT or Token
    const validUtxos = addressUtxo.value
      .filter(({ utxo }) => {
        const value = utxo.value
        const keys = Object.keys(value)
        return keys.length === 1 && keys[0] === 'lovelace' && !utxo.inlineDatum
      })
      .sort((a, b) => b.utxo.value.lovelace - a.utxo.value.lovelace)
    console.log(validUtxos)
    const minAmount = 5_000_000 // 5 ADA
    const maxAmount = 100_000_000 // 100 ADA
    const utxos: typeof validUtxos = []
    let commitAmount = 0
    for (const { txId, txIndex, utxo } of validUtxos) {
      if (commitAmount >= minAmount) continue
      if (commitAmount + utxo.value.lovelace > maxAmount) continue
      utxos.push({ txId, txIndex, utxo })
      commitAmount += utxo.value.lovelace
    }
    if (!utxos.length) {
      message.error('You need at least 20 ADA to play the game')
      return
    }
    gameStore.addMessage(
      `Auto select ${utxos.length} UTxOs to commit, 
      amount: ${BigNumber(commitAmount).div(1_000_000).toFormat()} ${useNetworkInfo().symbol}`,
      'BOT'
    )
    console.log('utxos to commit', utxos)
    await new Promise(resolve => setTimeout(() => resolve(true), 4000))

    const commitBody = utxos.reduce(
      (acc, { txId, txIndex, utxo }) => {
        acc[`${txId}#${txIndex}`] = { ...utxo }
        return acc
      },
      {} as Record<string, UTxOObjectValue>
    )
    const unsignedTx = await bridge.commit(commitBody)
    if (!unsignedTx) return
    console.log(unsignedTx)

    // Sign this tx
    gameStore.addMessage(
      `Trying to commit ${utxos.length} UTxOs into hydra node,
      unsigned txId: ${unsignedTx.txId}, type: ${unsignedTx.type}
      `,
      'BOT'
    )
    const cborHex = unsignedTx?.cborHex
    const signedCborHex = await wallet.signTx(cborHex, true, 0, 0)
    gameStore.addMessage(
      `Sign transaction and submit to join hydra node,
      txId: "${unsignedTx.txId}"", type: "Witnesses Tx ConwayEra"
      `,
      'BOT'
    )
    console.log(signedCborHex)
    const layer1SubmitResult = await bridge.submitCardanoTransaction({
      ...unsignedTx,
      cborHex: signedCborHex
    })
    console.log('>>> / layer1SubmitResult:', layer1SubmitResult)
    if (layer1SubmitResult) {
      gameStore.addMessage(
        `Submitted to cardano, waiting the opponent to join the game...
      `,
        'BOT'
      )
    }
  }

  function initHydraBridge() {
    const bridge = getBridge()
    // Sure about hydra is initialized and ready to commit
    if (bridge.headStatus !== HydraHeadStatus.Initializing) {
      gameStore.addMessage(`Waiting for hydra node to be initialized, it may take about 20s...`, 'BOT')
      bridge.waitHeadIsInitializing(40000) // 40s
    }
    bridge.events.on('onMessage', e => {
      switch (e.tag) {
        case HydraHeadTag.Greetings:
          console.log('Greetings from Hydra')
          if (e.headStatus === HydraHeadStatus.Initializing) {
            openHydraHead()
            return
          } else if (e.headStatus === HydraHeadStatus.Open) {
            gameStore.addMessage(`Hydra head is opened!`, 'BOT')
          }
          updateSnapshotUtxo()
          break
        case HydraHeadTag.SnapshotConfirmed:
          console.log('Snapshot confirmed', e)
          updateSnapshotUtxo()
          break
        case HydraHeadTag.HeadIsInitializing:
          console.log('Head is initializing', e)
          openHydraHead()
          break
        case HydraHeadTag.HeadIsOpen:
          gameStore.addMessage(`Everything got ready, let's go!!`, 'BOT')
          updateSnapshotUtxo()
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

  const snapshotUtxo = ref<UTxOObject>({})
  const snapshotUtxoArray = ref<ReturnType<typeof buildSnapshotUtxoArray>>([])

  const mySnapshotUtxo = computed(() => {
    return snapshotUtxoArray.value.filter(utxo => utxo.data.address === round.value.myAddress)
  })
  const enemySnapshotUtxo = computed(() => {
    return snapshotUtxoArray.value.filter(utxo => utxo.data.address === round.value.enemyAddress)
  })
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

  const myTotalLovelace = ref(0)
  const enemyTotalLovelace = ref(0)
  const isEnableChoice = computed(() => {
    return (
      myTotalLovelace.value >= round.value.betAmount &&
      !round.value.myChoice &&
      (round.value.status === RoundStatus.IDLE || round.value.status === RoundStatus.COMMIT)
    )
  })

  const calculateTotalLovelace = (snapshotUTxO: typeof snapshotUtxoArray.value) => {
    const total = snapshotUTxO.reduce((acc, cur) => {
      return (
        acc +
        parseInt(typeof cur.data.value.lovelace === 'string' ? cur.data.value.lovelace : `${cur.data.value.lovelace}`)
      )
    }, 0)
    return total
  }
  async function updateSnapshotUtxo() {
    if (!hydraBridge.value) return
    const snapshot = await hydraBridge.value.querySnapshotUtxo()
    snapshotUtxo.value = snapshot
    snapshotUtxoArray.value = buildSnapshotUtxoArray(snapshot)

    myTotalLovelace.value = calculateTotalLovelace(mySnapshotUtxo.value)
    enemyTotalLovelace.value = calculateTotalLovelace(enemySnapshotUtxo.value)

    // TODO: Replace it later
    // Get the enemy address
    if (!round.value.enemyAddress) {
      const enemyUtxos = snapshotUtxoArray.value.filter(utxo => utxo.data.address !== round.value.myAddress)
      if (!enemyUtxos.length) {
        console.log('Enemy is not found')
        return
      }
      round.value.enemyAddress = enemyUtxos[0].data.address
      gameStore.addMessage(`${round.value.enemyAddress} is ready to play with you!`, 'BOT')
    }

    // Check if the snapshotUtxo is updated
    await checkRoundStatus(snapshotUtxoArray.value)
  }

  const payoutTxDebound = ref<any>(null)
  async function checkRoundStatus(snapshotUtxoArray: ReturnType<typeof buildSnapshotUtxoArray>) {
    // find my utxo
    const myUtxoArr = snapshotUtxoArray.filter(utxo => utxo.data.address === round.value.myAddress)
    const enemyUtxoArr = snapshotUtxoArray.filter(utxo => utxo.data.address === round.value.enemyAddress)

    let myDatum: InlineDatum | null = null
    let enemyDatum: InlineDatum | null = null
    const payoutDatumTxs = []

    for (const utxo of myUtxoArr) {
      const inlineDatumObj = getInlineDatumObj(utxo.data)
      if (!inlineDatumObj) continue
      if (inlineDatumObj.s === DatumState.COMMIT) {
        round.value.status = RoundStatus.COMMIT
        round.value.myCommitTx = `${utxo.txHash}#${utxo.txIndex}`
        round.value.myEncryptedChoice = inlineDatumObj.m
      } else if (inlineDatumObj.s === DatumState.REVEAL) {
        round.value.myRevealTx = `${utxo.txHash}#${utxo.txIndex}`
        round.value.myRevealDatum = inlineDatumObj
      } else if (inlineDatumObj.s === DatumState.PAYOUT) {
        payoutDatumTxs.push(inlineDatumObj)
      }
      if (!myDatum) myDatum = inlineDatumObj
    }

    for (const utxo of enemyUtxoArr) {
      const inlineDatumObj = getInlineDatumObj(utxo.data)
      if (!inlineDatumObj) continue
      if (inlineDatumObj.s === DatumState.COMMIT) {
        round.value.status = RoundStatus.COMMIT
        round.value.enemyCommitTx = `${utxo.txHash}#${utxo.txIndex}`
        round.value.enemyEncryptedChoice = inlineDatumObj.m
      } else if (inlineDatumObj.s === DatumState.REVEAL) {
        round.value.enemyRevealTx = `${utxo.txHash}#${utxo.txIndex}`
        round.value.enemyKey = inlineDatumObj.k_o
        round.value.enemyRevealDatum = inlineDatumObj
      } else if (inlineDatumObj.s === DatumState.PAYOUT) {
        payoutDatumTxs.push(inlineDatumObj)
      }
      if (!enemyDatum) enemyDatum = inlineDatumObj
    }
    // check if both players have committed
    if (
      round.value.myChoice &&
      round.value.myKey &&
      round.value.myCommitTx &&
      round.value.enemyCommitTx &&
      (!round.value.myRevealTx || !round.value.enemyRevealTx) &&
      round.value.status === RoundStatus.COMMIT
    ) {
      round.value.status = RoundStatus.REVEAL
    } else if (
      round.value.myChoice &&
      round.value.myKey &&
      round.value.myCommitTx &&
      round.value.enemyCommitTx &&
      round.value.myRevealTx &&
      round.value.enemyRevealTx &&
      round.value.status === RoundStatus.REVEAL
    ) {
      round.value.status = RoundStatus.PAYOUT
    } else if (
      round.value.myChoice &&
      round.value.myKey &&
      round.value.myCommitTx &&
      round.value.enemyCommitTx &&
      round.value.myRevealTx &&
      round.value.enemyRevealTx &&
      round.value.status === RoundStatus.PAYOUT
    ) {
      round.value.status = RoundStatus.FINALIZED
    }

    if (round.value.status === RoundStatus.REVEAL && !round.value.myRevealTx) {
      if (!round.value.myChoice || !round.value.myCommitTx || !round.value.myKey || !round.value.enemyCommitTx) {
        if (!round.value.myChoice) console.log('round.value.myChoice is not set')
        if (!round.value.myKey) console.log('round.value.myKey is not set')
        if (!round.value.myCommitTx) console.log('round.value.myCommitTx is not set')
        if (!round.value.enemyCommitTx) console.log('round.value.enemyCommitTx is not set')
        return
      }
      gameStore.addMessage(`Build transaction reveal`, 'BOT')
      await buildTxReveal()
    } else if (
      round.value.status === RoundStatus.PAYOUT &&
      round.value.myRevealDatum &&
      round.value.enemyRevealDatum &&
      !round.value.myPayoutTx
    ) {
      // payout
      console.log('PAYOUT >>>', myDatum, enemyDatum)
      gameStore.addMessage(`Build transaction payout after 3s`, 'BOT')
      clearTimeout(payoutTxDebound.value)
      payoutTxDebound.value = setTimeout(() => {
        gameStore.addMessage(`Build transaction payout`, 'BOT')
        buildTxPayout(round.value.myRevealDatum, round.value.enemyRevealDatum, round.value.myRevealTx)
      }, 3000)
    }

    if (round.value.status === RoundStatus.FINALIZED) {
      //   showPopupResult.value = true
      console.log('RoundStatus.FINALIZED >>>', myDatum, enemyDatum)
      if (payoutDatumTxs.length === 2) {
        // All players have received the payout
        showPopupResult.value = true

        myTotalLovelace.value = calculateTotalLovelace(mySnapshotUtxo.value)
        enemyTotalLovelace.value = calculateTotalLovelace(enemySnapshotUtxo.value)
        if (round.value.result === RoundResult.WIN) {
          gameStore.addMessage(
            `You win, +${BigNumber(round.value.betAmount).div(1_000_000).toFormat()} ${networkInfo.symbol}`,
            'BOT'
          )
        } else if (round.value.result === RoundResult.LOSE) {
          gameStore.addMessage(
            `You lose, -${BigNumber(round.value.betAmount).div(1_000_000).toFormat()} ${networkInfo.symbol}`,
            'BOT'
          )
        } else {
          gameStore.addMessage(`Draw!`, 'BOT')
        }
      }
    }
  }

  async function handleCommit() {
    // build tx
    try {
      gameStore.addMessage(`Build transaction commit`, 'BOT')
      if (!round.value.myChoice) return
      const hashedChoice = hashChoice(round.value.myChoice)
      round.value.myKey = hashedChoice.key
      round.value.myEncryptedChoice = hashedChoice.encrypted

      const bridge = getBridge()
      bridge
        .createTransactionWithMultiUTxO({
          toAddress: round.value.myAddress,
          lovelace: round.value.betAmount.toString(),
          txHashes: mySnapshotUtxo.value.map(utxo => `${utxo.txHash}#${utxo.txIndex}` as TxHash),
          inlineDatum: {
            t: new Date().getTime(),
            m: hashedChoice.encrypted,
            s: 1 // 1: commit, 2: reveal, 3: payout
          },
          secret: {
            privateKey: getPrivateSigningKey()
          }
        })
        .then(({ txHash, cborHex }) => {
          console.log('Build tx commit txHash, cborHex: ', txHash, cborHex)
          gameStore.addMessage(`Build transaction commit success, txHash: "${txHash}"`, 'BOT')
          return bridge.commands.newTxSync({
            txHash,
            cborHex
          })
        })
        .then(rs => {
          console.log('>>> / rs:', rs)
        })
        .catch(e => {
          console.error('Error: ', e)
        })
        .finally(() => {
          loadingConfirm.value = false
        })
    } catch (e) {
      console.error('Error: ', e)
    } finally {
      loadingConfirm.value = false
    }
  }

  async function buildTxReveal() {
    if (!round.value.myChoice || !round.value.myCommitTx || !round.value.myKey || !round.value.enemyCommitTx) {
      if (!round.value.myChoice) console.log('round.value.myChoice is not set')
      if (!round.value.myKey) console.log('round.value.myKey is not set')
      if (!round.value.myCommitTx) console.log('round.value.myCommitTx is not set')
      if (!round.value.enemyCommitTx) console.log('round.value.enemyCommitTx is not set')
      return
    }
    const inlineDatum: RevealDatum = {
      t: new Date().getTime(),
      m: round.value.myEncryptedChoice,
      k_o: round.value.myKey,
      m_o: round.value.myChoice,
      r_1: round.value.myCommitTx,
      r_2: round.value.enemyCommitTx,
      s: 2
    }
    const bridge = getBridge()
    const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
      toAddress: round.value.myAddress,
      lovelace: round.value.betAmount.toString(),
      txHashes: mySnapshotUtxo.value.map(utxo => `${utxo.txHash}#${utxo.txIndex}` as TxHash),
      inlineDatum,
      secret: {
        privateKey: getPrivateSigningKey()
      }
    })
    await bridge.commands.newTx(cborHex)
  }

  async function buildTxPayout(
    myRevealDatum: RevealDatum | null,
    enemyRevealDatum: RevealDatum | null,
    myRevealTx: TxHash | ''
  ) {
    if (!myRevealDatum || !enemyRevealDatum || !myRevealTx) {
      if (!myRevealDatum) console.error('myRevealDatum is not set')
      if (!enemyRevealDatum) console.error('enemyRevealDatum is not set')
      if (!myRevealTx) console.error('myRevealTx is not set')
      return
    }
    // Validate the reveal data
    // 1. Validate choice hash
    if (!verifyChoice(myRevealDatum.m_o as ChoiceType, myRevealDatum.k_o, myRevealDatum.m)) {
      console.error('My reveal data is not valid')
      return
    }
    if (!verifyChoice(enemyRevealDatum.m_o as ChoiceType, enemyRevealDatum.k_o, enemyRevealDatum.m)) {
      console.log(enemyRevealDatum.m_o, enemyRevealDatum.k_o, enemyRevealDatum.m)
      console.error('Enemy reveal data is not valid')
      return
    }
    // 2. Validate the commitment
    // TODO: Xem lại xem có cần thiết validate cái này ko
    // if (myRevealDatum.r_1 !== round.value.myCommitTx) {
    //   console.error('My commit tx is not valid')
    //   return
    // }
    // if (enemyRevealDatum.r_2 !== round.value.enemyCommitTx) {
    //   console.error('Enemy commit tx is not valid')
    //   return
    // }
    if (myRevealDatum.r_2 !== enemyRevealDatum.r_1 || myRevealDatum.r_1 !== enemyRevealDatum.r_2) {
      console.error('My commit (r2) and enemy commit (r1) are not match ')
      return
    }

    console.log('Validate rule game >>>')
    console.log('myRevealDatum', myRevealDatum)
    console.log('enemyRevealDatum', enemyRevealDatum)
    round.value.enemyChoice = enemyRevealDatum.m_o
    // Rule game:
    if (myRevealDatum.m_o === enemyRevealDatum.m_o) {
      round.value.result = RoundResult.DRAW
      await sendPayout(myRevealTx, round.value.myAddress)
    } else if (
      (myRevealDatum.m_o === ChoiceType.ROCK && enemyRevealDatum.m_o === ChoiceType.SCISSORS) ||
      (myRevealDatum.m_o === ChoiceType.PAPER && enemyRevealDatum.m_o === ChoiceType.ROCK) ||
      (myRevealDatum.m_o === ChoiceType.SCISSORS && enemyRevealDatum.m_o === ChoiceType.PAPER)
    ) {
      round.value.result = RoundResult.WIN
      await sendPayout(myRevealTx, round.value.myAddress)
    } else {
      round.value.result = RoundResult.LOSE
      await sendPayout(myRevealTx, round.value.enemyAddress)
    }
    console.log('Change to FINALIZED: ', round.value.result)
  }

  async function sendPayout(myRevealTx: TxHash, toAddress: string) {
    const bridge = getBridge()
    const inlineDatum = {
      r: myRevealTx,
      s: 3 // payout
    }
    const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
      toAddress: toAddress,
      lovelace: round.value.betAmount.toString(),
      txHashes: [myRevealTx],
      inlineDatum,
      secret: {
        privateKey: getPrivateSigningKey()
      }
    })
    await bridge.commands.newTxSync({
      txHash,
      cborHex
    })
  }

  const loadingTest = ref(false)
  async function buildTxReset() {
    const bridge = getBridge()
    loadingTest.value = true
    const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
      toAddress: round.value.myAddress,
      lovelace: round.value.betAmount.toString(),
      txHashes: mySnapshotUtxo.value.map(utxo => `${utxo.txHash}#${utxo.txIndex}` as TxHash),
      inlineDatum: undefined,
      secret: {
        privateKey: getPrivateSigningKey()
      }
    })
    bridge.commands
      .newTxSync({
        txHash,
        cborHex,
        description: 'Reset tx'
      })
      .then(rs => {
        console.log('>>> / rs:', rs)
      })
      .catch(e => {
        console.error('Error: ', e)
      })
      .finally(() => {
        loadingTest.value = false
      })
  }

  const { rootKey } = storeToRefs(auth)
  const getPrivateSigningKey = () => {
    if (!rootKey.value) {
      throw new Error('Root key is not found')
    }
    const deriverationPath = ['1852H', '1815H', '0H', '0', '0'].map(path => {
      if (path.includes('H')) {
        return parseInt(path.replace('H', '')) | 0x80000000
      } else {
        return parseInt(path)
      }
    })
    return rootKey.value
      .derive(deriverationPath[0])
      .derive(deriverationPath[1])
      .derive(deriverationPath[2]) // Account index: 0'
      .derive(deriverationPath[3]) // 0
      .derive(deriverationPath[4]) // key index: 0
      .to_raw_key()
  }

  const loadingConfirm = ref(false)
  function onClickConfirm() {
    loadingConfirm.value = true
    if (!choice.value) return
    round.value.myChoice = choice.value
    // if (round.value.status !== RoundStatus.IDLE && round.value.status !== RoundStatus.COMMIT) return
    nextTick(() => {
      handleCommit()
    })
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
  async function startNewGame() {
    // reset all
    gameHistory.value.unshift(clone(round.value))
    showPopupResult.value = false
    gameStore.addMessage(`Prepare next round!`, 'BOT')
    await buildTxReset()

    round.value.myChoice = ''
    round.value.myEncryptedChoice = ''
    round.value.myCommitTx = ''
    round.value.myRevealTx = ''
    round.value.myKey = ''
    round.value.enemyChoice = ''
    round.value.enemyEncryptedChoice = ''
    round.value.enemyCommitTx = ''
    round.value.enemyRevealTx = ''
    round.value.enemyKey = ''

    round.value.status = RoundStatus.IDLE
    round.value.result = RoundResult.UNKNOWN
    round.value.myRevealDatum = null
    round.value.enemyRevealDatum = null
    gameStore.addMessage(`Ready, let's gooo!`, 'BOT')
  }
</script>

<template>
  <div class="relative flex h-full w-full flex-col p-4 text-white">
    <!-- TEST -->
    <div class="fixed right-8 top-10 flex flex-col gap-2" v-if="false">
      <a-button type="primary" @click="test()">Init</a-button>
      <a-button type="primary" @click="testClose()">Close head</a-button>
      <a-button type="primary" @click="startNewGame()">Reset</a-button>
      <a-button type="primary" @click="testFanout()">Fanout</a-button>
    </div>
    <!-- TEST -->
    <PopupRoundResult @continue="startNewGame()" v-model:open="showPopupResult" />

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
