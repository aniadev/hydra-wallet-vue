import getRepository, { RepoName } from '@/repositories'
import type { HydraGameRepository } from '@/repositories/game'
import { defineStore } from 'pinia'
import { Message, type Room } from '../types'
import { Event, HexcoreSocketClient } from '../utils/socket-client'
import Cookies from 'js-cookie'
import { message } from 'ant-design-vue'
import { HydraBridge } from '@/lib/hydra-bridge'
import {
  HydraCommand,
  HydraHeadStatus,
  HydraHeadTag,
  type Committed,
  type HydraPayload
} from '@/lib/hydra-bridge/types/payload.type'
import {
  ChoiceType,
  DatumState,
  Round,
  RoundResult,
  RoundStatus,
  type InlineDatum,
  type RevealDatum
} from '../types/game.type'
import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'
import { buildSnapshotUtxoArray, getInlineDatumObj } from '../utils'
import { hashChoice, verifyChoice } from '../utils/encrypt'
import BigNumber from 'bignumber.js'
import { networkInfo } from '@/constants/chain'
import { AppWallet } from '@/lib/hydra-wallet'
import type { HexcoreRepository } from '@/repositories/hexcore'
import type { CommitResponse } from '@/lib/hydra-bridge/types/commit.type'

export const useGameRPSStore = defineStore('game-rps-store', () => {
  const rooms = reactive({
    isLoading: false,
    items: [] as Room[]
  })
  const currentRoom = ref<Room | null>(null)

  const round = reactive<Round>(new Round(3000000))
  const messages = ref<Message[]>([])
  const gameHistory = ref<Round[]>([])

  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository
  const hexcoreApi = getRepository(RepoName.Hexcore) as HexcoreRepository
  const hydraBridge = ref<HydraBridge | null>(null)
  const hydraBridgeHeadStatus = ref<HydraHeadStatus>(HydraHeadStatus.Idle)

  const socketClient = ref<HexcoreSocketClient | null>(null)
  const socketConnected = ref(false)

  const loadingConfirm = ref(false)
  const loadingExit = ref(false)
  const auth = useAuthV2()

  // ========================
  // Popups
  const isShowPopupExit = ref(false)
  const isShowPopupHistory = ref(false)
  const showPopupResult = ref(false)

  async function init() {
    return new Promise<boolean>((resolve, reject) => {
      socketClient.value = new HexcoreSocketClient({
        url: import.meta.env.VITE_APP_HYDRA_GAME_WS_ENDPOINT,
        token: useLocalStorage('token', '').value
      })
      socketClient.value.events.on(Event.CONNECTED, () => {
        socketConnected.value = true
        resolve(true)
      })

      socketClient.value.events.on(Event.DISCONNECTED, () => {
        socketConnected.value = false
        reject(new Error('Disconnected'))
      })
    })
  }

  function cleanUp(options: { socketCleanUp?: boolean } = {}) {
    // TODO: Optimize this
    if (options.socketCleanUp) {
      socketClient.value?.cleanUp()
    }
    destroyBridge()
    currentRoom.value = null
    gameHistory.value = []

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
    round.result = RoundResult.UNKNOWN
    round.myRevealDatum = null
    round.enemyRevealDatum = null
  }

  const fetchRooms = async () => {
    try {
      rooms.isLoading = true
      const rs = await hydraGameApi.getGameRooms()
      rooms.items = rs.data.items
    } catch (error: any) {
      console.error(error)
    } finally {
      rooms.isLoading = false
    }
  }

  const fetchRoomDetail = async (roomId: number) => {
    try {
      const rs = await hydraGameApi.getGameRoomDetail(roomId)
      return rs.data
    } catch (error: any) {
      console.error(error)
    }
  }

  const setCurrentRoom = async (room: Room) => {
    const roomDetail = await fetchRoomDetail(room.id)
    if (!roomDetail) {
      message.error('Error when fetching room detail')
      return
    }
    // check room is full
    if (roomDetail.gameRoomDetails.length >= room.maxPlayers) {
      message.error('Room is full')
      return
    }
    // check free port
    console.log(roomDetail, room)
    const freeNode = roomDetail.party.hydraNodes.find(p => !roomDetail.gameRoomDetails.some(d => d.port === p.port))
    if (!freeNode) {
      message.error('No free port')
      return
    }
    // Request hexcore to join node
    const hydraNode = await socketClient.value?.joinRoom(room.id, freeNode.port)
    if (!hydraNode) {
      console.error('Error when joining room', hydraNode)
      message.error('Error when joining room')
      return
    }
    hydraBridge.value = new HydraBridge({
      host: `hydranode-${hydraNode.port}.hexcore.io.vn`, // ws://hydranode-10002.hdev99.io.vn,
      port: 443,
      protocol: 'wss',
      noHistory: true,
      noSnapshotUtxo: true
    })

    const bridge = hydraBridge.value
    bridge.connect()
    bridge.onError((e, ws) => {
      if (ws?.readyState === ws?.CLOSED) {
        message.error('Connection closed')
      }
    })

    bridge.events.on('onOpen', () => {
      addMessage(`Connected to Hydra Node`, 'BOT')
    })

    bridge.events.on('onMessage', payload => {
      // Update head status
      // Cause the head status in bridge is not a computed property, so we need to update it manually
      hydraBridgeHeadStatus.value = bridge.headStatus

      if (payload.tag === HydraHeadTag.Greetings) {
        handleGreetings(payload)
      } else if (payload.tag === HydraHeadTag.HeadIsOpen) {
        console.log('[📣 HydraBridge] Head is Open')
        handleHeadOpen(payload)
      } else if (payload.tag === HydraHeadTag.ReadyToFanout) {
        console.log('[📣 HydraBridge] Ready to Fanout')
        bridge.sendCommand({
          command: HydraCommand.Fanout,
          afterSendCb() {
            console.log('[📣 HydraBridge] Send command Fanout')
          }
        })
      } else if (payload.tag === HydraHeadTag.HeadIsClosed) {
        console.log('[📣 HydraBridge] Head is Closed')
        addMessage(`Head is closed, preparing to quit this game!`, 'BOT')
      } else if (payload.tag === HydraHeadTag.HeadIsFinalized) {
        console.log('[📣 HydraBridge] Head Is Finalized')
      } else if (payload.tag === HydraHeadTag.Committed) {
        console.log('[📣 HydraBridge] Committed')
        handleCommitted(payload)
      } else {
        // console.log('>>> / Not Found handler')
      }
    })

    currentRoom.value = room
  }

  const exitRoom = async () => {
    // TODO: Optimize this
    loadingExit.value = true
    try {
      await buildTxReset()
      currentRoom.value = null
      gameHistory.value = []

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
      round.result = RoundResult.UNKNOWN
      round.myRevealDatum = null
      round.enemyRevealDatum = null
    } catch (error) {
      console.error(error)
    } finally {
      loadingExit.value = false
    }
  }

  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  const destroyBridge = () => {
    try {
      const hydraBridge = getBridge()
      hydraBridge.disconnect()
      hydraBridge.events.all.clear()
    } catch (e) {
      console.error('>>> / onBeforeUnmount', e)
    }
  }

  function handleHeadOpen(payload: HydraPayload) {
    updateSnapshotUtxo()
      .then(() => {
        buildTxReset()
      })
      .catch(e => {
        console.error('Error: ', e)
      })
  }

  function handleGreetings(payload: HydraPayload) {
    console.log('[📣 HydraBridge] handleGreetings', payload)
    if (payload.tag !== HydraHeadTag.Greetings) return
    const bridge = getBridge()
    if (payload.headStatus === HydraHeadStatus.Final) {
      // Send init command
      bridge.commands.init()
    } else if (payload.headStatus === HydraHeadStatus.Initializing) {
      console.log('[📣 HydraBridge] Hydra head is Initializing')
      addMessage(`Hydra head Initializing, ID: "${payload.hydraHeadId}", vkey: "${payload.me.vkey}"`, 'BOT')
    } else if (payload.headStatus === HydraHeadStatus.Open) {
      console.log('[📣 HydraBridge] Hydra head is opened')
      handleHeadOpen(payload)
    } else if (payload.headStatus === HydraHeadStatus.Idle) {
      bridge.sendCommand({
        command: HydraCommand.Init,
        afterSendCb() {
          console.log('[📣 HydraBridge] Send command Init')
        }
      })
    } else if (payload.headStatus === HydraHeadStatus.FanoutPossible) {
      bridge.sendCommand({
        command: HydraCommand.Fanout,
        afterSendCb() {
          console.log('[📣 HydraBridge] Send command Fanout')
        }
      })
    } else {
      console.log('>>> / Not Final')
    }
  }

  // === Game logic ===

  const myTotalLovelace = ref(0)
  const enemyTotalLovelace = ref(0)
  const payoutTxDebound = ref<any>(null)

  const snapshotUtxo = ref<UTxOObject>({})
  const snapshotUtxoArray = ref<ReturnType<typeof buildSnapshotUtxoArray>>([])
  const setSnapshotUtxo = (utxo: UTxOObject) => {
    snapshotUtxo.value = utxo
    snapshotUtxoArray.value = buildSnapshotUtxoArray(utxo)
    mySnapshotUtxo.value = snapshotUtxoArray.value.filter(utxo => utxo.data.address === round.myAddress)
    enemySnapshotUtxo.value = snapshotUtxoArray.value.filter(utxo => utxo.data.address === round.enemyAddress)
  }

  const mySnapshotUtxo = ref<typeof snapshotUtxoArray.value>([])
  const enemySnapshotUtxo = ref<typeof snapshotUtxoArray.value>([])

  async function checkRoundStatus(snapshotUtxoArray: ReturnType<typeof buildSnapshotUtxoArray>) {
    // find my utxo
    const myUtxoArr = snapshotUtxoArray.filter(utxo => utxo.data.address === round.myAddress)
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
      addMessage(`Build transaction reveal`, 'BOT')
      await buildTxReveal()
    } else if (
      round.status === RoundStatus.PAYOUT &&
      round.myRevealDatum &&
      round.enemyRevealDatum &&
      !round.myPayoutTx
    ) {
      // payout
      console.log('PAYOUT >>>', myDatum, enemyDatum)
      addMessage(`Build transaction payout after 3s`, 'BOT')
      clearTimeout(payoutTxDebound.value)
      payoutTxDebound.value = setTimeout(() => {
        addMessage(`Build transaction payout`, 'BOT')
        buildTxPayout(round.myRevealDatum, round.enemyRevealDatum, round.myRevealTx)
      }, 3000)
    }

    if (round.status === RoundStatus.FINALIZED) {
      //   showPopupResult.value = true
      console.log('RoundStatus.FINALIZED >>>', myDatum, enemyDatum)
      if (payoutDatumTxs.length === 2) {
        // All players have received the payout
        showPopupResult.value = true

        myTotalLovelace.value = calculateTotalLovelace(mySnapshotUtxo.value)
        enemyTotalLovelace.value = calculateTotalLovelace(enemySnapshotUtxo.value)
        if (round.result === RoundResult.WIN) {
          addMessage(`You win, +${BigNumber(round.betAmount).div(1_000_000).toFormat()} ${networkInfo.symbol}`, 'BOT')
        } else if (round.result === RoundResult.LOSE) {
          addMessage(`You lose, -${BigNumber(round.betAmount).div(1_000_000).toFormat()} ${networkInfo.symbol}`, 'BOT')
        } else {
          addMessage(`Draw!`, 'BOT')
        }
      }
    }
  }

  async function openHydraHead() {
    if (!round.myAddress) {
      console.error('ERROR: round.myAddress is not found')
      return
    }
    const bridge = getBridge()
    // Init account
    const { rootKey } = auth
    if (!rootKey) {
      console.error('ERROR: rootKey is not found')
      return
    }
    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })
    const rs = await hexcoreApi.getUtxo(round.myAddress)
    const utxosOfAddress = Object.keys(rs.data).map(txHash => {
      const [txId, txIndex] = txHash.split('#')
      return {
        txId,
        txIndex: +txIndex,
        utxo: rs.data[txHash as TxHash]
      }
    })
    const totalLovelace = utxosOfAddress.reduce((acc, { utxo }) => acc + utxo.value.lovelace, 0)
    const totalBalance = BigNumber(totalLovelace).dividedBy(1_000_000).toFormat() + ' ' + useNetworkInfo().symbol
    addMessage('Your account is ready!', 'BOT')
    addMessage(`UTxOs: ${utxosOfAddress.length} | Total balance: ${totalBalance}`, 'BOT')
    // Auto select utxos to commit into head, from minimum to maximum
    // Only select utxos without NFT or Token
    const validUtxos = utxosOfAddress
      .filter(({ utxo }) => {
        const value = utxo.value
        const keys = Object.keys(value)
        return keys.length === 1 && keys[0] === 'lovelace' && !utxo.inlineDatum
      })
      .sort((a, b) => b.utxo.value.lovelace - a.utxo.value.lovelace)
    console.log(validUtxos)
    const minAmount = 10_000_000 // 10 ADA
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
    addMessage(
      `Auto select ${utxos.length} UTxOs to commit, 
      amount: ${BigNumber(commitAmount).div(1_000_000).toFormat()} ${useNetworkInfo().symbol}`,
      'BOT'
    )
    console.log('utxos to commit', utxos)
    await new Promise(resolve => setTimeout(() => resolve(true), 3000))

    const commitBody = utxos.reduce(
      (acc, { txId, txIndex, utxo }) => {
        acc[`${txId}#${txIndex}`] = { ...utxo }
        return acc
      },
      {} as Record<string, UTxOObjectValue>
    )
    let unsignedTx: CommitResponse | null = null
    try {
      unsignedTx = await bridge.commit(commitBody)
      if (!unsignedTx) throw new Error('unsignedTx is null')
    } catch (e: any) {
      if (e?.errorType === 'ScriptFailedInWallet' && e?.redeemerPtr && e.redeemerPtr.includes('ConwaySpending')) {
        // Lỗi xảy ra khi trước đó đã submit utxo để commit vào hydra node
        // Cần abort head và commit lại
        addMessage(`Someone has already committed this UTxO, retrying...`, 'BOT')
        retryToCommitHead()
        return
      }
      if (e?.response?.data?.tag === 'FailedToDraftTxNotInitializing') {
        addMessage(`Hydra Node is not initializing, retrying...`, 'BOT')
        retryToCommitHead(false)
        return
      }
      console.error('Error: ', e)
      message.error('Error when commit: ' + JSON.stringify(e?.response?.data || {}))
      return
    }
    console.log(unsignedTx)
    // Sign this tx
    addMessage(
      `Trying to commit ${utxos.length} UTxOs into hydra node,
      unsigned txId: ${unsignedTx.txId}, type: ${unsignedTx.type}
      `,
      'BOT'
    )
    const cborHex = unsignedTx?.cborHex
    const signedCborHex = await wallet.signTx(cborHex, true, 0, 0)
    addMessage(
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
      addMessage(
        `Submitted to cardano, waiting the opponent to join the game...
      `,
        'BOT'
      )
    } else {
      // Retry once
      addMessage('Retry once...', 'BOT')
      await new Promise(resolve => setTimeout(() => resolve(true), 3000))
      const unsignedTx = await bridge.commit(commitBody)
      if (!unsignedTx) return
      const cborHex = unsignedTx?.cborHex
      const signedCborHex = await wallet.signTx(cborHex, true, 0, 0)
      const layer1SubmitResult = await bridge.submitCardanoTransaction({
        ...unsignedTx,
        cborHex: signedCborHex
      })
      console.log('>>> / (Retry) layer1SubmitResult:', layer1SubmitResult)
      if (layer1SubmitResult) {
        addMessage(
          `Submitted to cardano, waiting the opponent to join the game...
      `,
          'BOT'
        )
      }
    }
  }

  async function retryToCommitHead(waitAbort = true) {
    if (waitAbort) {
      addMessage(`Send command to Hydra Node: {tag: "Abort"}`, 'BOT')
      getBridge().commands.abort()
      // Đợi đến khi hydra node aborted
      addMessage(`Waiting for hydra node to be aborted...`, 'BOT')
      await new Promise(resolve => {
        const bridge = getBridge()
        bridge.events.on('onMessage', payload => {
          if (payload.tag === HydraHeadTag.HeadIsAborted) {
            bridge.events.off('onMessage')
            addMessage(`Hydra Node is aborted`, 'BOT')
            resolve(true)
          }
        })
      })
    }

    // Đợi đến khi hydra node đã được khởi tạo lại
    const bridge = getBridge()
    addMessage(`Send command to Hydra Node: {tag: "Init"}`, 'BOT')
    await bridge.commands.initSync()
    await new Promise(resolve => {
      const bridge = getBridge()
      bridge.events.on('onMessage', payload => {
        if (payload.tag === HydraHeadTag.HeadIsInitializing) {
          bridge.events.off('onMessage')
          resolve(true)
        }
      })
    })
  }

  async function handleCommit() {
    // build tx
    try {
      addMessage(`Build transaction commit`, 'BOT')
      if (!round.myChoice) return
      const hashedChoice = await hashChoice(round.myChoice)
      round.myKey = hashedChoice.key
      round.myEncryptedChoice = hashedChoice.encrypted

      console.time('buildTxCommit')
      const bridge = getBridge()
      bridge
        .createTransactionWithMultiUTxO({
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
        .then(({ txHash, cborHex }) => {
          console.timeLog('buildTxCommit', txHash)
          addMessage(`Build transaction commit success, txHash: "${txHash}"`, 'BOT')
          return bridge.commands.newTxSync({
            txHash,
            cborHex
          })
        })
        .then(rs => {
          console.log('>>> / rs:', rs)
          console.timeEnd('buildTxCommit')
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
    addMessage(`Tx reveal datum: ${JSON.stringify(inlineDatum)}`, 'BOT')
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
    console.log('myRevealDatum', myRevealDatum)
    console.log('enemyRevealDatum', enemyRevealDatum)
    round.enemyChoice = enemyRevealDatum.m_o
    // Rule game:
    if (myRevealDatum.m_o === enemyRevealDatum.m_o) {
      round.result = RoundResult.DRAW
      await sendPayout(myRevealTx, round.myAddress)
    } else if (
      (myRevealDatum.m_o === ChoiceType.ROCK && enemyRevealDatum.m_o === ChoiceType.SCISSORS) ||
      (myRevealDatum.m_o === ChoiceType.PAPER && enemyRevealDatum.m_o === ChoiceType.ROCK) ||
      (myRevealDatum.m_o === ChoiceType.SCISSORS && enemyRevealDatum.m_o === ChoiceType.PAPER)
    ) {
      round.result = RoundResult.WIN
      await sendPayout(myRevealTx, round.myAddress)
    } else {
      round.result = RoundResult.LOSE
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
    if (!hydraBridge.value) {
      console.error('HydraBridge is not initialized')
      return
    }
    const snapshot = await hydraBridge.value.querySnapshotUtxo()
    setSnapshotUtxo(snapshot)

    myTotalLovelace.value = calculateTotalLovelace(mySnapshotUtxo.value)
    enemyTotalLovelace.value = calculateTotalLovelace(enemySnapshotUtxo.value)

    // TODO: Replace it later
    // Get the enemy address
    if (!round.enemyAddress) {
      const enemyUtxos = snapshotUtxoArray.value.filter(utxo => utxo.data.address !== round.myAddress)
      if (!enemyUtxos.length) {
        console.log('Enemy is not found')
        return
      }
      round.enemyAddress = enemyUtxos[0].data.address
      addMessage(`${round.enemyAddress} is ready to play with you!`, 'BOT')
    }

    // Check if the snapshotUtxo is updated
    await checkRoundStatus(snapshotUtxoArray.value)
  }

  const getPrivateSigningKey = () => {
    const { rootKey } = auth
    if (!rootKey) {
      throw new Error('Root key is not found')
    }
    const deriverationPath = ['1852H', '1815H', '0H', '0', '0'].map(path => {
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

  async function buildTxReset() {
    try {
      const bridge = getBridge()
      const totalLovelace = calculateTotalLovelace(mySnapshotUtxo.value)
      console.log('>>> / totalLovelace:', totalLovelace)

      const { txHash, cborHex } = await bridge.createTransactionWithMultiUTxO({
        toAddress: round.myAddress,
        lovelace: totalLovelace.toString(),
        txHashes: mySnapshotUtxo.value.map(utxo => `${utxo.txHash}#${utxo.txIndex}` as TxHash),
        inlineDatum: undefined,
        secret: {
          privateKey: getPrivateSigningKey()
        }
      })
      const rs = await bridge.commands.newTxSync({
        txHash,
        cborHex,
        description: 'Reset tx'
      })
      console.log('>>> / rs:', rs)
    } catch (e) {
      console.error('Error: ', e)
    }
  }

  async function startNewGame() {
    // reset all
    const lastRound = Object.assign({}, round)
    gameHistory.value.unshift(lastRound)
    showPopupResult.value = false
    addMessage(`Prepare next round!`, 'BOT')
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
    round.result = RoundResult.UNKNOWN
    round.myRevealDatum = null
    round.enemyRevealDatum = null
    addMessage(`Ready, let's gooo!`, 'BOT')
  }

  async function validateOpenedHead(e: HydraPayload) {
    const bridge = getBridge()
    const snapshot = await bridge.querySnapshotUtxo()
    console.log(e, snapshot, round)
    // user must have 1 utxo with address is round.myAddress
    const myUtxos = Object.entries(snapshot).filter(([_, utxo]) => utxo.address === round.myAddress)
    if (myUtxos.length === 0) {
      message.error('You have not access to this game')
      return
    }
  }

  // ========================

  function handleCommitted(payload: Readonly<Committed>) {
    if (payload.party.vkey === hydraBridge.value?.vkey) {
      addMessage(`You committed to open hydra`, 'BOT')
    } else {
      addMessage(`Opponent committed to open hydra`, 'BOT')
    }
  }

  function addMessage(content: string, type: 'BOT' | 'USER' = 'BOT') {
    const message = new Message({ content, type })
    messages.value.push(message)
  }

  return {
    rooms,
    fetchRooms,
    fetchRoomDetail,
    setCurrentRoom,
    currentRoom,
    hydraGameApi,
    init,
    cleanUp,
    socketClient,
    hydraBridge,
    hydraBridgeHeadStatus,
    messages,
    round,
    addMessage,
    gameHistory,
    snapshotUtxoArray,
    snapshotUtxo,
    mySnapshotUtxo,
    myTotalLovelace,
    enemySnapshotUtxo,
    enemyTotalLovelace,
    openHydraHead,
    startNewGame,
    handleCommit,
    updateSnapshotUtxo,
    buildTxReset,
    exitRoom,
    validateOpenedHead,

    // Button states
    loadingConfirm,
    loadingExit,

    // Popups
    isShowPopupExit,
    isShowPopupHistory,
    showPopupResult,

    // Socket
    socketConnected
  }
})
