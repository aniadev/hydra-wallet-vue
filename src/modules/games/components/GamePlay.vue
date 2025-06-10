<script lang="ts" setup>
  import type { HydraBridge } from '@/lib/hydra-bridge'
  import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'
  import { snapshotUtxoToArray } from '@/lib/hydra-bridge/utils/builder'
  import { useRpsStore } from '../stores/_rpsStore_bkup'
  import { storeToRefs } from 'pinia'
  import { HydraHeadTag, type HydraPayload } from '@/lib/hydra-bridge/types/payload.type'

  import CryptoJs from 'crypto-js'
  import { DatumState, type InlineDatum, type PayoutDatum, type RevealDatum } from '../interfaces'
  import { message } from 'ant-design-vue'
  import { formatId, formatNumber } from '@/utils/format'
  import PopupRoundResult from '../rps/components/gameplay/PopupRoundResult.vue'
  import BigNumber from 'bignumber.js'
  import DebugDrawer from './DebugDrawer.vue'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { networkInfo } from '@/constants/chain'

  const rpsStore = useRpsStore()
  const { hydraBridge } = storeToRefs(rpsStore)

  const props = defineProps<{
    accountAddress: string
    accountDerivationPath: string[]
  }>()

  const emits = defineEmits<{
    update: []
  }>()

  // Game play logic
  const room = reactive({
    players: [
      {
        address: 'addr_test1vqzfkzttg6qf0nce9swphtyl9sgw3662cq45nuu39g75mfcve7w36'
      },
      {
        address: 'addr_test1vr8le6lr77dekrdt387gt98p5hmajr3zy3unqt7g8nzk37q802vqw'
      }
    ]
  })
  enum RoundStatus {
    IDLE = 'IDLE',
    COMMIT = 'COMMIT',
    REVEAL = 'REVEAL',
    PAYOUT = 'PAYOUT',
    FINALIZED = 'FINALIZED'
  }
  enum Choice {
    ROCK = 'ROCK',
    PAPER = 'PAPER',
    SCISSORS = 'SCISSORS'
  }

  const round = reactive({
    id: 1,
    betAmount: 3000000, // 3 ADA
    status: RoundStatus.IDLE,
    result: '' as 'win' | 'lose' | 'draw' | '',

    myAddress: props.accountAddress,
    myCommitTx: '' as TxHash | '',
    myRevealTx: '' as TxHash | '',
    myRevealDatum: null as RevealDatum | null,
    myPayoutTx: '' as TxHash | '',
    myChoice: '' as Choice | '',
    myKey: '',
    myEncryptedChoice: '',

    enemyAddress: room.players.filter(player => player.address !== props.accountAddress)[0].address,
    enemyCommitTx: '' as TxHash | '',
    enemyRevealTx: '' as TxHash | '',
    enemyRevealDatum: null as RevealDatum | null,
    enemyChoice: '' as Choice | '',
    enemyKey: '',
    enemyEncryptedChoice: ''
  })
  const showPopupResult = ref(false)

  const snapshotUtxo = ref<UTxOObject>({})
  const snapshotUtxoArray = computed(() => buildSnapshotUtxoArray(snapshotUtxo.value))
  const buildSnapshotUtxoArray = (snapshot: UTxOObject) => {
    const txIds = Object.keys(snapshot) as TxHash[]
    return txIds.map(txId => {
      const [txHash, txIndex] = txId.split('#')
      const utxo = snapshot[txId]
      return {
        txHash,
        txIndex: parseInt(txIndex),
        data: utxo
      }
    })
  }

  const mySnapshotUtxo = computed(() => {
    return snapshotUtxoArray.value.filter(utxo => utxo.data.address === round.myAddress)
  })
  const enemySnapshotUtxo = computed(() => {
    return snapshotUtxoArray.value.filter(utxo => utxo.data.address === round.enemyAddress)
  })
  const myTotalLovelace = computed(() => {
    const total = mySnapshotUtxo.value.reduce((acc, cur) => {
      return (
        acc +
        parseInt(typeof cur.data.value.lovelace === 'string' ? cur.data.value.lovelace : `${cur.data.value.lovelace}`)
      )
    }, 0)
    return total
  })
  const enemyTotalLovelace = computed(() => {
    const total = enemySnapshotUtxo.value.reduce((acc, cur) => {
      return (
        acc +
        parseInt(typeof cur.data.value.lovelace === 'string' ? cur.data.value.lovelace : `${cur.data.value.lovelace}`)
      )
    }, 0)
    return total
  })

  async function updateSnapshotUtxo() {
    if (!hydraBridge.value) return
    const snapshot = await hydraBridge.value.querySnapshotUtxo()
    snapshotUtxo.value = snapshot
    // Check if the snapshotUtxo is updated
    await checkRoundStatus(buildSnapshotUtxoArray(snapshot))
  }

  const payoutTxDebound = ref<any>(null)
  async function checkRoundStatus(snapshotUtxoArray: ReturnType<typeof buildSnapshotUtxoArray>) {
    // find my utxo
    const myUtxoArr = snapshotUtxoArray.filter(utxo => utxo.data.address === props.accountAddress)
    const enemyUtxoArr = snapshotUtxoArray.filter(utxo => utxo.data.address === round.enemyAddress)

    let myDatum: InlineDatum | null = null
    let enemyDatum: InlineDatum | null = null
    const payoutDatumTxs = []

    for (const utxo of myUtxoArr) {
      const inlineDatumObj = getInlineDatumObj(utxo.data)
      if (!inlineDatumObj) continue
      if (inlineDatumObj.s === DatumState.COMMIT) {
        round.status = RoundStatus.COMMIT
        round.myCommitTx = `${utxo.txHash}#${utxo.txIndex}`
        round.myEncryptedChoice = inlineDatumObj.m
      } else if (inlineDatumObj.s === DatumState.REVEAL) {
        round.myRevealTx = `${utxo.txHash}#${utxo.txIndex}`
        round.myRevealDatum = inlineDatumObj
      } else if (inlineDatumObj.s === DatumState.PAYOUT) {
        payoutDatumTxs.push(inlineDatumObj)
      }
      if (!myDatum) myDatum = inlineDatumObj
    }

    for (const utxo of enemyUtxoArr) {
      const inlineDatumObj = getInlineDatumObj(utxo.data)
      if (!inlineDatumObj) continue
      if (inlineDatumObj.s === DatumState.COMMIT) {
        round.status = RoundStatus.COMMIT
        round.enemyCommitTx = `${utxo.txHash}#${utxo.txIndex}`
        round.enemyEncryptedChoice = inlineDatumObj.m
      } else if (inlineDatumObj.s === DatumState.REVEAL) {
        round.enemyRevealTx = `${utxo.txHash}#${utxo.txIndex}`
        round.enemyKey = inlineDatumObj.k_o
        round.enemyRevealDatum = inlineDatumObj
      } else if (inlineDatumObj.s === DatumState.PAYOUT) {
        payoutDatumTxs.push(inlineDatumObj)
      }
      if (!enemyDatum) enemyDatum = inlineDatumObj
    }
    // check if both players have committed
    if (
      round.myChoice &&
      round.myKey &&
      round.myCommitTx &&
      round.enemyCommitTx &&
      (!round.myRevealTx || !round.enemyRevealTx) &&
      round.status === RoundStatus.COMMIT
    ) {
      round.status = RoundStatus.REVEAL
    } else if (
      round.myChoice &&
      round.myKey &&
      round.myCommitTx &&
      round.enemyCommitTx &&
      round.myRevealTx &&
      round.enemyRevealTx &&
      round.status === RoundStatus.REVEAL
    ) {
      round.status = RoundStatus.PAYOUT
    } else if (
      round.myChoice &&
      round.myKey &&
      round.myCommitTx &&
      round.enemyCommitTx &&
      round.myRevealTx &&
      round.enemyRevealTx &&
      round.status === RoundStatus.PAYOUT
    ) {
      round.status = RoundStatus.FINALIZED
    }

    if (round.status === RoundStatus.REVEAL && !round.myRevealTx) {
      if (!round.myChoice || !round.myCommitTx || !round.myKey || !round.enemyCommitTx) {
        if (!round.myChoice) console.log('round.myChoice is not set')
        if (!round.myKey) console.log('round.myKey is not set')
        if (!round.myCommitTx) console.log('round.myCommitTx is not set')
        if (!round.enemyCommitTx) console.log('round.enemyCommitTx is not set')
        return
      }
      await buildTxReveal()
    } else if (
      round.status === RoundStatus.PAYOUT &&
      round.myRevealDatum &&
      round.enemyRevealDatum &&
      !round.myPayoutTx
    ) {
      // payout
      console.log('PAYOUT >>>', myDatum, enemyDatum)
      console.log('PAYOUT >>>, build payout tx after 3s')
      clearTimeout(payoutTxDebound.value)
      payoutTxDebound.value = setTimeout(() => {
        buildTxPayout(round.myRevealDatum, round.enemyRevealDatum, round.myRevealTx)
      }, 3000)
    }

    if (round.status === RoundStatus.FINALIZED) {
      //   showPopupResult.value = true
      console.log('RoundStatus.FINALIZED >>>', myDatum, enemyDatum)
      if (payoutDatumTxs.length === 2) {
        // All players have received the payout
        showPopupResult.value = true
      }
    }
  }

  function getInlineDatumObj(utxoValue: UTxOObjectValue): InlineDatum | null {
    const inlineDatum = utxoValue.inlineDatum
    if (!inlineDatum || !('bytes' in inlineDatum)) return null
    const inlineDatumJsonData = Buffer.from(inlineDatum.bytes, 'hex').toString('utf-8')
    try {
      return JSON.parse(inlineDatumJsonData) as InlineDatum
    } catch (e) {
      throw new Error('Error parsing inlineDatum')
    }
  }

  const loadingConfirm = ref(false)
  async function onClickConfirm() {
    if (!round.myChoice) return
    if (round.status !== RoundStatus.IDLE && round.status !== RoundStatus.COMMIT) return
    loadingConfirm.value = true
    const rs = await handleCommit()
  }

  async function handleCommit() {
    // build tx
    if (!round.myChoice) return
    const hashedChoice = hashChoice(round.myChoice)
    round.myKey = hashedChoice.key
    round.myEncryptedChoice = hashedChoice.encrypted

    const bridge = getBridge()
    const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
      toAddress: round.myAddress,
      lovelace: round.betAmount.toString(),
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
    try {
      const rs = await bridge.commands.newTxSync({
        txHash,
        cborHex
      })
      return rs
    } catch (e) {
      console.error('Error: ', e)
    } finally {
      loadingConfirm.value = false
    }
  }

  async function buildTxReveal() {
    if (!round.myChoice || !round.myCommitTx || !round.myKey || !round.enemyCommitTx) {
      if (!round.myChoice) console.log('round.myChoice is not set')
      if (!round.myKey) console.log('round.myKey is not set')
      if (!round.myCommitTx) console.log('round.myCommitTx is not set')
      if (!round.enemyCommitTx) console.log('round.enemyCommitTx is not set')
      return
    }
    const inlineDatum: RevealDatum = {
      t: new Date().getTime(),
      m: round.myEncryptedChoice,
      k_o: round.myKey,
      m_o: round.myChoice,
      r_1: round.myCommitTx,
      r_2: round.enemyCommitTx,
      s: 2
    }
    const bridge = getBridge()
    const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
      toAddress: round.myAddress,
      lovelace: round.betAmount.toString(),
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
    if (!verifyChoice(myRevealDatum.m_o as Choice, myRevealDatum.k_o, myRevealDatum.m)) {
      console.error('My reveal data is not valid')
      return
    }
    if (!verifyChoice(enemyRevealDatum.m_o as Choice, enemyRevealDatum.k_o, enemyRevealDatum.m)) {
      console.log(enemyRevealDatum.m_o, enemyRevealDatum.k_o, enemyRevealDatum.m)
      console.error('Enemy reveal data is not valid')
      return
    }
    // 2. Validate the commitment
    // TODO: Xem lại xem có cần thiết validate cái này ko
    // if (myRevealDatum.r_1 !== round.myCommitTx) {
    //   console.error('My commit tx is not valid')
    //   return
    // }
    // if (enemyRevealDatum.r_2 !== round.enemyCommitTx) {
    //   console.error('Enemy commit tx is not valid')
    //   return
    // }
    if (myRevealDatum.r_2 !== enemyRevealDatum.r_1 || myRevealDatum.r_1 !== enemyRevealDatum.r_2) {
      console.error('My commit (r2) and enemy commit (r1) are not match ')
      return
    }

    console.log('Validate rule game >>>')
    // Rule game:
    if (myRevealDatum.m_o === enemyRevealDatum.m_o) {
      round.result = 'draw'
      await sendPayout(myRevealTx, round.myAddress)
    } else if (
      (myRevealDatum.m_o === Choice.ROCK && enemyRevealDatum.m_o === Choice.SCISSORS) ||
      (myRevealDatum.m_o === Choice.PAPER && enemyRevealDatum.m_o === Choice.ROCK) ||
      (myRevealDatum.m_o === Choice.SCISSORS && enemyRevealDatum.m_o === Choice.PAPER)
    ) {
      round.result = 'win'
      await sendPayout(myRevealTx, round.myAddress)
    } else {
      round.result = 'lose'
      await sendPayout(myRevealTx, round.enemyAddress)
    }
    console.log('Change to FINALIZED: ', round.result)
  }

  async function sendPayout(myRevealTx: TxHash, toAddress: string) {
    const bridge = getBridge()
    const inlineDatum = {
      r: myRevealTx,
      s: 3 // payout
    }
    const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
      toAddress: toAddress,
      lovelace: round.betAmount.toString(),
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
      toAddress: round.myAddress,
      lovelace: round.betAmount.toString(),
      txHashes: mySnapshotUtxo.value.map(utxo => `${utxo.txHash}#${utxo.txIndex}` as TxHash),
      inlineDatum: undefined,
      secret: {
        privateKey: getPrivateSigningKey()
      }
    })
    console.log('buildTxReset', { txHash, cborHex })
    return
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

  const auth = useAuthV2()
  const getPrivateSigningKey = () => {
    const rootKey = auth.rootKey
    if (!rootKey) {
      throw new Error('Root key is not found')
    }
    const deriverationPath = props.accountDerivationPath.map(path => {
      if (path.includes('H')) {
        return parseInt(path.replace('H', '')) | 0x80000000
      } else {
        return parseInt(path)
      }
    })
    return rootKey
      .derive(deriverationPath[0])
      .derive(deriverationPath[1])
      .derive(deriverationPath[2]) // Account index: 0'
      .derive(deriverationPath[3]) // 0
      .derive(deriverationPath[4]) // key index: 0
      .to_raw_key()
  }

  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  const hashChoice = (choice: Choice) => {
    const aesKey = CryptoJs.lib.WordArray.random(8).toString()
    const encrypted = CryptoJs.PBKDF2(choice, aesKey).toString()
    return {
      choice,
      key: aesKey,
      encrypted
    }
  }

  const verifyChoice = (choice: Choice, key: string, encrypted: string) => {
    const decrypted = CryptoJs.PBKDF2(choice, key).toString()
    return decrypted === encrypted
  }

  async function onClickTEST() {
    // reset all
    await buildTxReset()

    round.myChoice = ''
    round.myEncryptedChoice = ''
    round.myCommitTx = ''
    round.myRevealTx = ''
    round.myKey = ''
    round.enemyChoice = ''
    round.enemyEncryptedChoice = ''
    round.enemyCommitTx = ''
    round.enemyRevealTx = ''
    round.enemyKey = ''

    round.status = RoundStatus.IDLE
    round.result = ''
    round.myRevealDatum = null
    round.enemyRevealDatum = null
    showPopupResult.value = false
  }

  const isEnableChoice = computed(() => {
    return (
      myTotalLovelace.value >= round.betAmount ||
      (round.status === RoundStatus.IDLE && !round.myChoice) ||
      (round.status === RoundStatus.COMMIT && !round.myChoice)
    )
  })

  onMounted(async () => {
    console.log('GamePlay mounted')
    const bridge = getBridge()
    updateSnapshotUtxo()
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

    bridge.events.on('onMessage', e => {
      debuggerProps.value.push({
        tag: e.tag,
        json: JSON.stringify(e, null, 2),
        timestamp: new Date().getTime(),
        seq: 'seq' in e ? e.seq : ''
      })
      switch (e.tag) {
        case HydraHeadTag.Greetings:
          console.log('Greetings from Hydra')
          updateSnapshotUtxo()
          break
        case HydraHeadTag.SnapshotConfirmed:
          console.log('Snapshot confirmed', e)
          updateSnapshotUtxo()
          emits('update')
          break
      }
    })
  })
  onBeforeUnmount(() => {
    const bridge = getBridge()
    bridge.events.off('onMessage')
  })

  // For debugger
  const columns = [
    {
      title: 'TxId',
      dataIndex: 'txHash',
      key: 'name'
    },
    {
      title: 'Addr',
      dataIndex: 'address',
      key: 'address'
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value'
    }
  ]

  const debuggerProps = ref<
    {
      tag: string
      json: string
      timestamp: number | string
      seq: number | ''
    }[]
  >([])
</script>

<template>
  <div class="mt-4">
    <PopupRoundResult :status="round.result" @continue="onClickTEST()" v-model:open="showPopupResult" />
    <DebugDrawer :data="debuggerProps" />
    <div class="mb-6 grid grid-cols-2 gap-2">
      <a-table :dataSource="mySnapshotUtxo" :columns="columns" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'txHash'">
            <p>{{ `${formatId(record.txHash, 3, 4)}#${record.txIndex}` }}</p>
          </template>
          <template v-else-if="column.dataIndex === 'address'">
            <a-popover :title="record.data.address">
              <template #content>
                <p>Datum:</p>
                <highlightjs
                  language="js"
                  class="text-10px w-full"
                  :code="JSON.stringify(getInlineDatumObj(record.data), null, 2)"
                />
              </template>
              <p class="text-blue-4">{{ formatId(record.data.address, 3, 4) }}</p>
            </a-popover>
          </template>
          <template v-else-if="column.dataIndex === 'value'">
            <p>
              {{
                BigNumber(record.data.value.lovelace)
                  .div(10 ** 6)
                  .toFormat()
              }}
            </p>
          </template>
        </template>
      </a-table>
      <a-table :dataSource="enemySnapshotUtxo" :columns="columns" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'txHash'">
            <p>{{ `${formatId(record.txHash, 3, 4)}#${record.txIndex}` }}</p>
          </template>
          <template v-else-if="column.dataIndex === 'address'">
            <a-popover :title="record.data.address">
              <template #content>
                <p>Datum:</p>
                <highlightjs
                  language="js"
                  class="text-10px w-full"
                  :code="JSON.stringify(getInlineDatumObj(record.data), null, 2)"
                />
              </template>
              <p class="text-blue-4">{{ formatId(record.data.address, 3, 4) }}</p>
            </a-popover>
          </template>
          <template v-else-if="column.dataIndex === 'value'">
            <p>
              {{
                BigNumber(record.data.value.lovelace)
                  .div(10 ** 6)
                  .toFormat()
              }}
            </p>
          </template>
        </template>
      </a-table>
    </div>
    <div class="">round status: {{ round.status }}</div>
    <div class="grid grid-cols-2">
      <div class="">
        <div class="">My choice: {{ round.myChoice }}</div>
        <div class="">$: {{ formatNumber(myTotalLovelace) }}</div>
      </div>
      <div class="">
        <div class="">
          Enemy choice:
          {{ round.enemyEncryptedChoice ? formatId(round.enemyEncryptedChoice) : `Waiting for enemy's move` }}
        </div>
        <div class="">$: {{ formatNumber(enemyTotalLovelace) }}</div>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-2" :class="{ disabled: !isEnableChoice }">
      <div
        class="rounded-1 bg-green-4 h-15 border-green-4 flex w-full items-center justify-center border-2 border-solid"
        hover="cursor-pointer bg-op-70"
        :class="{ '!border-black': round.myChoice === Choice.ROCK }"
        @click="round.myChoice = Choice.ROCK"
      >
        ROCK
      </div>
      <div
        class="rounded-1 bg-green-4 h-15 border-green-4 flex w-full items-center justify-center border-2 border-solid"
        hover="cursor-pointer bg-op-70"
        :class="{ '!border-black': round.myChoice === Choice.PAPER }"
        @click="round.myChoice = Choice.PAPER"
      >
        PAPER
      </div>
      <div
        class="rounded-1 bg-green-4 h-15 border-green-4 flex w-full items-center justify-center border-2 border-solid"
        hover="cursor-pointer bg-op-70"
        :class="{ '!border-black': round.myChoice === Choice.SCISSORS }"
        @click="round.myChoice = Choice.SCISSORS"
      >
        SCISSORS
      </div>
    </div>
    <div class="mt-2 w-full">
      <a-button
        @click="onClickConfirm()"
        :loading="loadingConfirm"
        :disabled="!isEnableChoice"
        class="w-full"
        size="large"
        type="primary"
      >
        CONFIRM
      </a-button>
    </div>
    <div class="mt-2 w-full">
      <a-button @click="onClickTEST()" :loading="loadingTest" class="w-full" size="large" type="default">
        TEST
      </a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .disabled {
    user-select: none;
    pointer-events: none;
    opacity: 0.7;
  }
</style>
