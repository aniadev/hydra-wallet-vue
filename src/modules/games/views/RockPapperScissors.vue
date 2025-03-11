<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import { useRpsStore } from '../stores/rpsStore'
  import type { HydraRepository } from '@/repositories/hydra'
  import { storeToRefs } from 'pinia'
  import type { UtxoObjectValue } from '@/modules/hydra/interfaces'
  import { message, type TableColumnType } from 'ant-design-vue'
  import { formatId } from '@/utils/format'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'
  import { BigNum, CoinSelectionStrategyCIP2, PrivateKey } from '@emurgo/cardano-serialization-lib-browser'
  import { useCopy } from '@/utils/useCopy'
  import ModalSelectUTxO from '../components/ModalSelectUTxO.vue'
  import axios from 'axios'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { HydraBridge } from '@/lib/hydra-bridge'
  import { HydraCommand, HydraHeadStatus, HydraHeadTag, type HydraPayload } from '@/lib/hydra-bridge/types/payload.type'
  import type { HydraBridgeSubmitter } from '@/lib/hydra-bridge/types/submitter.type'
  import type { UTxOObject } from '@/lib/hydra-bridge/types/utxo.type'
  import type { SubmitTxBody } from '@/lib/hydra-bridge/types/submit-tx.type'

  const rpsStore = useRpsStore()

  const route = useRoute()
  const nodeId = ref(route.query.node as string)

  onMounted(async () => {
    const { rootKey } = auth
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }
    console.log(rootKey.to_bech32())

    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })

    console.log(wallet)
    console.log('getUsedAddress', wallet.getUsedAddress().toBech32())

    address.value = wallet.getUsedAddress().toBech32()
    const walletId = currentWallet.value?.id as string
    const rs = await hydraApi.getListUtxo(walletId, { address: address.value })
    listUtxo.value = rs.map(el => ({
      txId: `${el.txhash}`,
      txIndex: el.txindex,
      utxo: {
        address: el.address,
        datum: null,
        datumhash: null,
        inlineDatum: null,
        referenceScript: null,
        value: {
          lovelace: el.value
        }
      }
    }))
    selectedUtxo.value = listUtxo.value[0]

    initSocketConnection()
  })
  onBeforeUnmount(() => {
    const hydraBridge = getBridge()
    hydraBridge.disconnect()
  })

  const hydraApi = getRepository(RepoName.Hydra) as HydraRepository
  const authStore = useAuthV2()
  const { currentWallet } = storeToRefs(authStore)
  const address = ref('')
  const keyhash = ref('')
  const derivePath = ['1852H', '1815H', '0H', '0', '0']
  const listUtxo = ref<{ txId: string; txIndex: number; utxo: UtxoObjectValue }[]>([])
  const columns = ref<TableColumnType[]>([
    {
      title: 'TxHash',
      dataIndex: 'txHash'
    },
    {
      title: 'Index',
      dataIndex: 'index'
    },
    {
      title: 'Value',
      dataIndex: 'value'
    }
  ])
  const formatAmount = (value: number) => {
    return BigNumber(value)
      .div(10 ** networkInfo.decimals)
      .toFormat()
  }
  const walletCore = useWalletCore()
  const auth = useAuthV2()
  const ws = ref<WebSocket | null>(null)

  const signedTransactionData = ref({
    jsValue: {},
    hex: ''
  })

  const selectedUtxo = ref<{ txId: string; txIndex: number; utxo: UtxoObjectValue } | null>(null)
  const copyUtxo = (data: { txId: string; txIndex: number; utxo: UtxoObjectValue }) => {
    const json = JSON.stringify(
      {
        [`${data.txId}#${data.txIndex}`]: {
          ...data.utxo
        }
      },
      null,
      4
    )
    useCopy(json)
  }
  async function onClickCommit() {
    if (!selectedUtxo.value) {
      message.error('Select utxo first')
      return
    }
    const hydraHeadInfo = {
      host: route.query.host as string,
      port: route.query.port as string,
      partyId: +(route.query.partyId as string),
      hydraHeadId: +(route.query.hydraHeadId as string)
    }
    if (!hydraBridge.value) {
      console.error('HydraBridge is not initialized')
      return
    }
    const unsignedTx = await hydraBridge.value.commit({
      [`${selectedUtxo.value.txId}#${selectedUtxo.value.txIndex}`]: {
        ...selectedUtxo.value.utxo
      }
    })
    if (!unsignedTx) return
    const cborHex = unsignedTx?.cborHex
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
    const signedCborHex = await wallet.signTx(cborHex, true, 0, 0)
    const rs = await hydraBridge.value.submitCardanoTransaction({
      ...unsignedTx,
      cborHex: signedCborHex
    })
    console.log('>>> / rs:', rs)
    if (rs) {
      message.success('TransactionSubmitted')
    }
  }

  const hydraBridge = ref<HydraBridge | null>(null)
  function initSocketConnection() {
    const host = route.query.host as string
    const port = route.query.port as string
    const partyId = route.query.partyId as string
    const headId = route.query.hydraHeadId as string
    if (!host || !port || !partyId || !headId) {
      console.error('PARAM is invalid')
      return
    }
    const submitter = initHydraSubmitter()
    hydraBridge.value = new HydraBridge({
      host,
      port,
      protocol: 'wss',
      noHistory: true,
      noSnapshotUtxo: true
      // submitter: submitter
    })

    const bridge = hydraBridge.value
    bridge.connect()
    bridge.onError((e, ws) => {
      if (ws?.readyState === ws?.CLOSED) {
        message.error('Connection closed')
      }
    })
    bridge.onMessage(payload => {
      console.log('>>> / payload:', payload)
      if (payload.tag === HydraHeadTag.Greetings) {
        handleGreetings(payload)
      } else if (payload.tag === HydraHeadTag.HeadIsOpen) {
        message.success('[HydraBridge] Head is Open')
        handleHeadOpen(payload)
      } else if (payload.tag === HydraHeadTag.ReadyToFanout) {
        message.success('[HydraBridge] Ready to Fanout')
        bridge.sendCommand({
          command: HydraCommand.Fanout,
          afterSendCb() {
            message.success('[HydraBridge] Send command Fanout')
          }
        })
      } else if (payload.tag === HydraHeadTag.HeadIsClosed) {
        message.success('[HydraBridge] Head is Closed')
      } else if (payload.tag === HydraHeadTag.HeadIsFinalized) {
        message.success('[HydraBridge] Head Is Finalized')
      } else {
        console.log('>>> / Not Found handler')
      }
    })
  }

  function handleHeadOpen(payload: HydraPayload) {
    console.log('handleHeadOpen', payload)
  }

  function handleGreetings(payload: HydraPayload) {
    console.log('handleGreetings', payload)
    if (payload.tag !== HydraHeadTag.Greetings) return
    const bridge = getBridge()
    if (payload.headStatus === HydraHeadStatus.Final) {
      // Send init command
      bridge.sendCommand({
        command: HydraCommand.Init,
        afterSendCb() {
          message.success('[HydraBridge] Send command Init')
        }
      })
    } else if (payload.headStatus === HydraHeadStatus.Initializing) {
      message.success('[HydraBridge] Hydra head Initializing, ready to click open')
    } else if (payload.headStatus === HydraHeadStatus.Open) {
      message.success('[HydraBridge] Hydra head is opened')
    } else if (payload.headStatus === HydraHeadStatus.Idle) {
      bridge.sendCommand({
        command: HydraCommand.Init,
        afterSendCb() {
          message.success('[HydraBridge] Send command Init')
        }
      })
    } else {
      console.log('>>> / Not Final')
    }
  }

  const hydraUTxO = ref<UTxOObject>({})
  async function getUtxoResponse() {
    const bridge = getBridge()
    hydraUTxO.value = await bridge.querySnapshotUtxo()
  }

  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  const initHydraSubmitter = (): HydraBridgeSubmitter => {
    const hydraHeadInfo = {
      host: route.query.host as string,
      port: route.query.port as string,
      partyId: +(route.query.partyId as string),
      hydraHeadId: +(route.query.hydraHeadId as string)
    }
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:3010',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const commit: HydraBridgeSubmitter['commit'] = async data => {
      try {
        type CommitProxyBody = {
          partyId: number
          hydraHeadId: number
          utxo: UTxOObject
        }
        const body: CommitProxyBody = {
          partyId: hydraHeadInfo.partyId,
          hydraHeadId: hydraHeadInfo.hydraHeadId,
          utxo: data
        }

        const rs = await axiosInstance.post('/hydra-main/commit-node', body)
        return rs.data.data
      } catch (error) {
        console.error('>>> / error:', error)
        return null
      }
    }
    const submitCardanoTx: HydraBridgeSubmitter['submitCardanoTx'] = async data => {
      try {
        type SubmitTxProxyBody = {
          partyId: number
          hydraHeadId: number
          transaction: SubmitTxBody
        }
        const body: SubmitTxProxyBody = {
          partyId: hydraHeadInfo.partyId,
          hydraHeadId: hydraHeadInfo.hydraHeadId,
          transaction: data
        }
        const rs = await axiosInstance.post('/hydra-main/submit-node', body)
        return rs.data.data
      } catch (error) {
        console.error('>>> / error:', error)
        return null
      }
    }

    return {
      commit,
      submitCardanoTx
    }
  }

  const buildTx = async () => {
    const walletId = currentWallet.value?.id as string
    const rootKey = auth.rootKey
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
    console.log(walletCore.getSigningKey(rootKey).toJSON())
    const skey = wallet.getAccount(0, 0).paymentKey
    console.log('SKEY', skey.hex())
    console.log('VKEY', wallet.getAccount(0, 0).paymentKey.toPublic().hex())
    console.log('Base Address', wallet.getAccount(0, 0).baseAddressBech32)
    console.log('Enterprise Address', wallet.getAccount(0, 0).enterpriseAddressBech32)
    console.log('Reward Address', wallet.getAccount(0, 0).rewardAddressBech32)
    console.log('Stake key', wallet.getAccount(0, 0).stakeKeyHex)

    //
    console.log('Start build tx', hydraBridge.value)
    const privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // 0
      .derive(0) // key index: 0
      .to_raw_key()

    const txCbor2 = await hydraBridge.value!.createTransactionWithMultiUTxO({
      txHashes: ['682bd15d3516ce67205c2248b70770e54faba55a7bea471743ce811fe817985b#0'],
      lovelace: '5000000',
      toAddress:
        'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
      inlineDatum: {
        t: new Date().getTime(),
        m: 'ROCK',
        k: 30000 // 30s
      },
      secret: {
        privateKey: privateSigningKey
      }
    })
    console.log('txCbor2', txCbor2)
    hydraBridge.value?.commands.newTx(txCbor2)
  }
</script>

<template>
  <div class="p-4">
    <div class="">
      <div class="flex">
        <div class="text-sm">Address: {{ formatId(address, 16, 10) }}</div>
        <div class="ml-4 text-sm">{{ derivePath.join('/') }}</div>
      </div>
      <div class="text-sm">Keyhash: {{ keyhash }}</div>
      <div class="flex items-center">
        UTXO:
        <div class="flex items-center" v-if="selectedUtxo">
          <div class="w-180px ml-4 flex text-sm">
            {{ formatId(selectedUtxo.txId, 7, 7) }}#{{ selectedUtxo.txIndex }}
          </div>
          <div class="text-primary text-sm">
            {{
              BigNumber(selectedUtxo.utxo.value.lovelace)
                .div(10 ** networkInfo.decimals)
                .toFormat()
            }}
            {{ networkInfo.symbol }}
          </div>
          <a-button @click="copyUtxo(selectedUtxo)" size="small" class="ml-5">Copy</a-button>
        </div>
        <div class="text-sm" v-else>null</div>
      </div>
      <div class="flex items-center">
        <ModalSelectUTxO :list-utxo="listUtxo" @select="val => (selectedUtxo = val)" />
        <a-button @click="onClickCommit()" class="ml-3"> Commit and Open head </a-button>
      </div>
      <hr />
      <div class="max-h-100 overflow-auto">
        <highlightjs language="js" class="text-10px w-full" :code="JSON.stringify(hydraUTxO, null, 2)" />
      </div>
      <!-- <div class="mt-2 h-10">
        <a-button @click="useCopy(signedTransactionData.hex)"> Copy </a-button>
        <highlightjs language="text" class="text-10px mt-1 w-full" :code="signedTransactionData.hex" />
      </div> -->
    </div>
    <div class="mt-8">Get UTxO:</div>
    <a-button @click="getUtxoResponse()">Get UTxO</a-button>
    <div class="mt-8">Build tx:</div>
    <a-button @click="buildTx()">Build and Send</a-button>
  </div>
</template>

<style lang="scss" scoped></style>
