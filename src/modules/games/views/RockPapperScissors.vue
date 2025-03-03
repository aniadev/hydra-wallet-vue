<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import SelectionScreen from '../components/SelectionScreen.vue'
  import type { UtxoObject } from '../interfaces'
  import { RpsGame } from '../resources/rps'
  import { useRpsStore } from '../stores/rpsStore'
  import type { HydraRepository } from '@/repositories/hydra'
  import { storeToRefs } from 'pinia'
  import type { UtxoObjectValue } from '@/modules/hydra/interfaces'
  import { message, type TableColumnType } from 'ant-design-vue'
  import { formatId } from '@/utils/format'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'
  import { BigNum, CoinSelectionStrategyCIP2 } from '@emurgo/cardano-serialization-lib-browser'
  import { useCopy } from '@/utils/useCopy'
  import ModalSelectUTxO from '../components/ModalSelectUTxO.vue'
  import axios from 'axios'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { HydraBridge } from '@/lib/hydra-bridge'
  import { HydraCommand, HydraHeadStatus, HydraHeadTag } from '@/lib/hydra-bridge/types/payload.type'
  import type { HydraBridgeSubmitter } from '@/lib/hydra-bridge/types/submitter.type'
  import type { UTxOObject } from '@/lib/hydra-bridge/types/utxo.type'
  import type { Transaction } from '@/lib/hydra-bridge/types/transaction.type'
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

  async function test() {
    // create tx
    const walletId = currentWallet.value?.id as string
    const rootKey = auth.rootKey
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }
    const _privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(1) // 1
      .derive(0) // Address index: 0
      .to_raw_key()
    const _publicKey = _privateSigningKey.to_public()
    const _stakingPrivateKey = rootKey
      .derive(1852 | 0x80000000) // Purpose: 1852'
      .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(2) // Internal chain: 2 (for staking)
      .derive(0) // Staking key index: 0

    keyhash.value = _publicKey.hash().to_hex()
    // Get address UTXOs
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

    const wasmUtxos = CardanoWasm.TransactionUnspentOutputs.new()

    listUtxo.value.forEach(item => {
      const utxoJson = JSON.stringify({
        input: {
          transaction_id: item.txId,
          index: item.txIndex
        },
        output: {
          address: item.utxo.address,
          amount: {
            coin: `${item.utxo.value.lovelace}`,
            multiasset: null
          },
          plutus_data: null,
          script_ref: null
        }
      })
      wasmUtxos.add(CardanoWasm.TransactionUnspentOutput.from_json(utxoJson))
    })

    // instantiate the tx builder with the Cardano protocol parameters - these may change later on
    const linearFee = CardanoWasm.LinearFee.new(
      CardanoWasm.BigNum.from_str('44'),
      CardanoWasm.BigNum.from_str('155381')
    )
    const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
      .fee_algo(linearFee)
      .pool_deposit(CardanoWasm.BigNum.from_str('500000000')) // stakePoolDeposit
      .key_deposit(CardanoWasm.BigNum.from_str('2000000')) // stakeAddressDeposit
      .max_value_size(5000) // maxValueSize
      .max_tx_size(16384) // maxTxSize
      .coins_per_utxo_byte(CardanoWasm.BigNum.from_str('0'))
      .build()
    const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
    console.log('>>> / txBuilder:', txBuilder)

    // add a keyhash input - for ADA held in a Shelley-era normal address (Base, Enterprise, Pointer)
    const prvKey = walletCore.getPrivateKey(rootKey)
    txBuilder.add_inputs_from(wasmUtxos, CoinSelectionStrategyCIP2.LargestFirstMultiAsset)

    // base address
    const outputAddress =
      'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0'
    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(outputAddress)
    // // pointer address
    const skey = walletCore.getSigningKey(rootKey)
    const vkey = walletCore.getVerificationKey(skey)
    const pointerAddress = vkey.toPointerAddress(networkInfo.networkId).to_address()

    // add output to the tx

    const feeAmount = '170869'
    txBuilder.set_fee(CardanoWasm.BigNum.from_str(feeAmount))
    console.log('>>> / feeAmount:', feeAmount)

    const amountSend = '1000000' // 1 ADA

    const txOutput = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountSend))
    )

    txBuilder.add_output(txOutput)
    // set the time to live - the absolute slot value before the tx becomes invalid
    const latestSlot = 84342209
    txBuilder.set_ttl(latestSlot + 2000)

    // add metadata
    const data = { 0: 'Hello i am Hai dev' }
    const metadata = CardanoWasm.GeneralTransactionMetadata.new()
    const txMetadatum = CardanoWasm.encode_json_str_to_metadatum(
      JSON.stringify(data),
      CardanoWasm.MetadataJsonSchema.BasicConversions
    )
    metadata.insert(BigNum.from_str('0'), txMetadatum)

    const auxiliaryData = CardanoWasm.AuxiliaryData.new()
    auxiliaryData.set_metadata(metadata)
    txBuilder.set_auxiliary_data(auxiliaryData)
    console.log(txBuilder.get_auxiliary_data()?.to_js_value())

    // calculate the min fee required and send any change to an address
    const shelleyChangeAddress = CardanoWasm.Address.from_bech32(address.value)
    txBuilder.add_change_if_needed(shelleyChangeAddress)

    // once the transaction is ready, we build it to get the tx body without witnesses
    const txBody = txBuilder.build()
    const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
    const txHash = tx.transaction_hash()

    // add keyhash witnesses
    const txWitnessSet = CardanoWasm.TransactionWitnessSet.new()

    // Sign the transaction
    const privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(1) //
      .derive(0) // Address index: 0
      .to_raw_key()
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, privateSigningKey)
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new()
    vkeyWitnesses.add(vkeyWitness)
    txWitnessSet.set_vkeys(vkeyWitnesses)
    // const signedTransaction = CardanoWasm.Transaction.new(
    //   txBody,
    //   txWitnessSet,
    //   auxiliaryData // transaction metadata
    // )
    // signedTransactionData.value.jsValue = JSON.parse(signedTransaction.to_json())
    // signedTransactionData.value.hex = signedTransaction.to_hex()
  }

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
      protocol: 'ws',
      noHistory: true,
      noSnapshotUtxo: true,
      submitter: submitter
    })

    const bridge = hydraBridge.value
    bridge.connect()
    bridge.onMessage(payload => {
      console.log('>>> / payload:', payload)
      if (payload.tag === HydraHeadTag.Greetings) {
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
        } else {
          console.log('>>> / Not Final')
        }
      } else if (payload.tag === HydraHeadTag.HeadIsOpen) {
        message.success('[HydraBridge] Head is Open')
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
      }
    })
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

    // instantiate the tx builder with the Cardano protocol parameters - these may change later on
    const linearFee = CardanoWasm.LinearFee.new(
      CardanoWasm.BigNum.from_str('44'),
      CardanoWasm.BigNum.from_str('155381')
    )
    const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
      .fee_algo(linearFee)
      .pool_deposit(CardanoWasm.BigNum.from_str('500000000')) // stakePoolDeposit
      .key_deposit(CardanoWasm.BigNum.from_str('2000000')) // stakeAddressDeposit
      .max_value_size(5000) // maxValueSize
      .max_tx_size(16384) // maxTxSize
      .coins_per_utxo_byte(CardanoWasm.BigNum.from_str('0'))
      .build()
    const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
    console.log('>>> / txBuilder:', txBuilder)

    const utxoJson = JSON.stringify({
      input: {
        transaction_id: '173da0dbf817248a920d34169a124f9876436524b4b1db9ee10a3c59254373d8',
        index: 7
      },
      output: {
        address:
          'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
        amount: {
          coin: `${4000000}`,
          multiasset: null
        },
        plutus_data: null,
        script_ref: null
      }
    })
    const wasmUtxos = CardanoWasm.TransactionUnspentOutputs.new()
    wasmUtxos.add(CardanoWasm.TransactionUnspentOutput.from_json(utxoJson))
    txBuilder.add_inputs_from(wasmUtxos, CoinSelectionStrategyCIP2.LargestFirstMultiAsset)

    // base address
    const outputAddress =
      'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0'
    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(outputAddress)

    // add output to the tx

    const feeAmount = '0'
    txBuilder.set_fee(CardanoWasm.BigNum.from_str(feeAmount))
    console.log('>>> / feeAmount:', feeAmount)

    const amountSend = '1000000' // 1 ADA

    const txOutput = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountSend))
    )

    txBuilder.add_output(txOutput)
    // set the time to live - the absolute slot value before the tx becomes invalid
    txBuilder.set_ttl_bignum(CardanoWasm.BigNum.from_str(`${85312546 + 2000}`))

    // add metadata
    const data = { 0: 'Hello i am Hai dev' }
    const metadata = CardanoWasm.GeneralTransactionMetadata.new()
    const txMetadatum = CardanoWasm.encode_json_str_to_metadatum(
      JSON.stringify(data),
      CardanoWasm.MetadataJsonSchema.BasicConversions
    )
    metadata.insert(BigNum.from_str('0'), txMetadatum)

    const auxiliaryData = CardanoWasm.AuxiliaryData.new()
    auxiliaryData.set_metadata(metadata)
    txBuilder.set_auxiliary_data(auxiliaryData)
    console.log(txBuilder.get_auxiliary_data()?.to_js_value())

    // calculate the min fee required and send any change to an address
    const shelleyChangeAddress = CardanoWasm.Address.from_bech32(address.value)
    txBuilder.add_change_if_needed(shelleyChangeAddress)

    // once the transaction is ready, we build it to get the tx body without witnesses
    const txBody = txBuilder.build()
    const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
    const txHash = tx.transaction_hash()

    const unsignedTx = CardanoWasm.Transaction.new(
      txBody,
      CardanoWasm.TransactionWitnessSet.new(),
      auxiliaryData // transaction metadata
    )

    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })
    const signedCborHex = await wallet.signTx(unsignedTx.to_hex(), true, 0, 0)
    console.log('>>> / signedCborHex:', signedCborHex)
    hydraBridge.value?.sendCommand({
      command: HydraCommand.NewTx,
      payload: {
        transaction: {
          cborHex: signedCborHex,
          description: 'Ledger Cddl Format',
          type: 'Witnessed Tx ConwayEra'
        }
      },
      afterSendCb() {
        message.success('[HydraBridge] Send command NewTx')
      }
    })
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
        <highlightjs
          language="js"
          class="text-10px w-full"
          :code="JSON.stringify(signedTransactionData.jsValue, null, 2)"
        />
      </div>
      <div class="mt-2 h-10">
        <a-button @click="useCopy(signedTransactionData.hex)"> Copy </a-button>
        <highlightjs language="text" class="text-10px mt-1 w-full" :code="signedTransactionData.hex" />
      </div>
    </div>
    <div class="mt-8">Build tx:</div>
    <a-button @click="buildTx()">Build and Send</a-button>
  </div>
</template>

<style lang="scss" scoped></style>
