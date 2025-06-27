<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import { useRpsStore } from '../stores/_rpsStore_bkup'
  import type { HydraRepository } from '@/repositories/hydra'
  import { storeToRefs } from 'pinia'
  import type { UtxoObject, UtxoObjectValue } from '@/modules/hydra/interfaces'
  import { message, type TableColumnType } from 'ant-design-vue'
  import { formatId } from '@/utils/format'
  import BigNumber from 'bignumber.js'
  import { networkInfo } from '@/constants/chain'
  import { useCopy } from '@/utils/useCopy'
  import ModalSelectUTxO from '../components/ModalSelectUTxO.vue'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { HydraBridge } from '@/lib/hydra-bridge'
  import { HydraCommand, HydraHeadStatus, HydraHeadTag, type HydraPayload } from '@/lib/hydra-bridge/types/payload.type'
  import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'
  import GamePlay from '../components/GamePlay.vue'
  import type { HexcoreRepository } from '@/repositories/hexcore'
  import { buildEnterpriseAddress } from '@/lib/utils/builder'
  import { Hash28ByteBase16 } from '@cardano-sdk/crypto'
  import { Bip32PrivateKey, CoinSelectionStrategyCIP2 } from '@emurgo/cardano-serialization-lib-browser'
  import { stringToHex } from '@/lib/utils/parser'
  import BlueprintCommit from '../components/playground/BlueprintCommit.vue'
  import SendToken from '../components/playground/SendToken.vue'
  import DecommitFund from '../components/playground/DecommitFund.vue'
  import Authentication from '../components/playground/Authentication.vue'
  import { CardanoWasm } from '@/composables/useWalletCore'

  import { computePPViewHashBrowser, defaultPP } from '@/utils/protocol-parameters-hash'

  const rpsStore = useRpsStore()
  const { hydraBridge } = storeToRefs(rpsStore)

  const route = useRoute()

  const _rootKey = ref<Bip32PrivateKey | null>(null)

  onMounted(async () => {
    rpsStore.initSocketConnection()

    computePPViewHashBrowser(defaultPP).then(hash => {
      console.log('PPViewHash:', hash)
    })
  })

  const hexcoreApi = getRepository(RepoName.Hexcore) as HexcoreRepository
  const authStore = useAuthV2()
  const { currentWallet } = storeToRefs(authStore)
  const address = ref('')
  const keyhash = ref('')
  const derivePath = ['1852H', '1815H', '0H', '0', '0']
  const listUtxo = ref<{ txId: string; txIndex: number; utxo: UTxOObjectValue }[]>([])
  const formatAmount = (value: number) => {
    return BigNumber(value)
      .div(10 ** networkInfo.decimals)
      .toFormat()
  }
  const walletCore = useWalletCore()
  const auth = useAuthV2()

  const selectedUtxoHashes = ref<TxHash[]>([])
  const selectedUtxos = computed(() => {
    if (!selectedUtxoHashes.value.length) return []
    return selectedUtxoHashes.value.map(hash => {
      const [txId, txIndex] = hash.split('#')
      return { txId, txIndex, utxo: listUtxo.value.find(item => item.txId === txId && item.txIndex === +txIndex)?.utxo }
    })
  })
  const copyUtxo = (data: { txId: string; txIndex: number; utxo: UTxOObjectValue }) => {
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

  async function refetchLayer1Utxo() {
    const rs = await hexcoreApi.getUtxo(address.value)
    const data = rs.data
    listUtxo.value = Object.keys(data).map(txHash => {
      const [txId, txIndex] = txHash.split('#')
      return {
        txId,
        txIndex: +txIndex,
        utxo: data[txHash as TxHash]
      }
    })
    selectedUtxoHashes.value = [listUtxo.value.map(item => `${item.txId}#${item.txIndex}` as TxHash)[0]]
  }

  async function onClickCommit() {
    if (!selectedUtxoHashes.value.length) {
      message.error('Select utxo first')
      return
    }
    const commitUtxos = selectedUtxos.value.reduce((acc, item) => {
      if (!item.utxo) return acc
      acc[`${item.txId}#${item.txIndex}`] = item.utxo
      return acc
    }, {} as UTxOObject)
    commitUtxoToHydra(commitUtxos)
  }

  function onClickEmptyCommit() {
    commitUtxoToHydra({})
  }

  async function commitUtxoToHydra(utxos: UTxOObject) {
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

    const unsignedTx = await hydraBridge.value.commit(utxos)
    if (!unsignedTx) return
    const cborHex = unsignedTx?.cborHex
    const rootKey = _rootKey.value
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
    console.log(signedCborHex)

    const rs = await hydraBridge.value.submitCardanoTransaction({
      ...unsignedTx,
      cborHex: signedCborHex
    })
    console.log('>>> / rs:', rs)
    if (rs) {
      message.success('TransactionSubmitted')
    }
  }

  async function onClickDeposit() {
    if (!selectedUtxoHashes.value.length) {
      message.error('Select utxo first')
      return
    }
    const commitUtxos = selectedUtxos.value.reduce(
      (acc, item) => {
        if (!item.utxo) return acc
        acc[`${item.txId}#${item.txIndex}`] = item.utxo
        return acc
      },
      {} as Record<TxHash, UTxOObjectValue>
    )
    const unsignedTx = await hydraBridge.value?.commit({
      ...commitUtxos
    })
    if (!unsignedTx) return
    const cborHex = unsignedTx?.cborHex
    const rootKey = _rootKey.value
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
    console.log(signedCborHex)

    const rs = await hydraBridge.value?.submitCardanoTransaction({
      ...unsignedTx,
      cborHex: signedCborHex
    })
    console.log('>>> / rs:', rs)
    if (rs) {
      message.success('TransactionSubmitted')
    }
  }

  function onSelectUtxo(txHashes: TxHash[]) {
    selectedUtxoHashes.value = txHashes
    console.log(
      'selectedUtxos',
      selectedUtxos.value.reduce((acc, item) => {
        if (!item.utxo) return acc
        acc[`${item.txId}#${item.txIndex}`] = item.utxo
        return acc
      }, {} as UTxOObject)
    )
  }

  const hydraUTxO = ref<UTxOObject>({})
  async function getUtxoResponse() {
    const bridge = getBridge()
    hydraUTxO.value = await bridge.querySnapshotUtxo()
    console.log('hydraUTxO', JSON.stringify(hydraUTxO.value, null, 2))
  }

  const getBridge = () => {
    if (!hydraBridge.value) {
      throw new Error('HydraBridge is not initialized')
    }
    return hydraBridge.value
  }

  const buildTx = async () => {
    const rootKey = _rootKey.value
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

    const { cborHex } = await hydraBridge.value!.createTransactionWithMultiUTxO({
      txHashes: ['ea66b6143f76c9fd934d17b72189ff75e12776c4277dbe54e38a066b1c7ed96c#2'],
      lovelace: '5000000',
      toAddress:
        'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0',
      inlineDatum: undefined,
      secret: {
        privateKey: privateSigningKey
      }
    })
    console.log('txCbor2', cborHex)
    hydraBridge.value?.commands.newTx(cborHex)
  }

  const cborHex = ref('')
  const partialSign = ref(false)
  const customSignTx = async () => {
    const rootKey = _rootKey.value
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
    console.log('cborHex', cborHex.value)
    const tx = CardanoWasm.Transaction.from_bytes(Buffer.from(cborHex.value, 'hex'))
    const txBody = tx.body()
    console.log('txBody', txBody.to_js_value())
    const signedCborHex = await wallet.signTx(cborHex.value, partialSign.value, 0, 0)
    console.log('signedCborHex', signedCborHex)
  }

  const customSendTx = () => {
    const bridge = getBridge()
    bridge.commands.newTx(cborHex.value, '', () => {
      console.log('Send TX')
    })
  }

  const closeHead = () => {
    const bridge = getBridge()
    bridge.commands.close()
  }

  const getTxBuilder = () => {
    // config tx builder
    const linearFee = CardanoWasm.LinearFee.new(
      CardanoWasm.BigNum.from_str('44'),
      CardanoWasm.BigNum.from_str('155381')
    )
    // config cost for script
    /**
     *
      "executionUnitPrices": {
        "priceMemory": 0,
        "priceSteps": 0
      }
      "maxTxExecutionUnits": {
        "memory": 14000000,
        "steps": 10000000000
      },
      "maxBlockExecutionUnits": {
          "memory": 62000000,
          "steps": 20000000000
      },
     */
    const exUnitPrices = CardanoWasm.ExUnitPrices.new(
      // executionUnitPrices
      CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('1')), // mem: 0 -> 1
      CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('1')) // steps: 0 -> 1
    )
    const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
      .fee_algo(linearFee)
      .pool_deposit(CardanoWasm.BigNum.from_str('500000000')) // stakePoolDeposit
      .key_deposit(CardanoWasm.BigNum.from_str('2000000')) // stakeAddressDeposit
      .max_value_size(5000) // maxValueSize
      .max_tx_size(16384) // maxTxSize
      .coins_per_utxo_byte(CardanoWasm.BigNum.from_str('4310')) // utxoCostPerByte
      .ex_unit_prices(exUnitPrices)
      .ref_script_coins_per_byte(
        CardanoWasm.UnitInterval.new(
          CardanoWasm.BigNum.from_str('15'), // 15 lovelace/byte khi full price unit là 1.000.000
          CardanoWasm.BigNum.from_str('1000000')
        ) // minFeeRefScriptCostPerByte
      )
      .build()
    const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
    return txBuilder
  }

  // FIXME:
  const buildCostModels = () => {
    const PlutusV1 = [
      100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000, 100, 16000, 100, 16000,
      100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100, 94375, 32, 132994, 32, 61462, 4, 72010, 178, 0, 1,
      22151, 32, 91189, 769, 4, 2, 85848, 228465, 122, 0, 1, 1, 1000, 42921, 4, 2, 24548, 29498, 38, 1, 898148, 27279,
      1, 51775, 558, 1, 39184, 1000, 60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1, 13169, 4, 22100, 10, 28999,
      74, 1, 28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32, 72362, 32, 7243, 32, 7391, 32, 11546, 32,
      85848, 228465, 122, 0, 1, 1, 90434, 519, 0, 1, 74433, 32, 85848, 228465, 122, 0, 1, 1, 85848, 228465, 122, 0, 1,
      1, 270652, 22588, 4, 1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663, 32, 59498, 32,
      20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 53384111, 14333, 10
    ]
    const PlutusV2 = [
      100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000, 100, 16000, 100, 16000,
      100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100, 94375, 32, 132994, 32, 61462, 4, 72010, 178, 0, 1,
      22151, 32, 91189, 769, 4, 2, 85848, 228465, 122, 0, 1, 1, 1000, 42921, 4, 2, 24548, 29498, 38, 1, 898148, 27279,
      1, 51775, 558, 1, 39184, 1000, 60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1, 13169, 4, 22100, 10, 28999,
      74, 1, 28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32, 72362, 32, 7243, 32, 7391, 32, 11546, 32,
      85848, 228465, 122, 0, 1, 1, 90434, 519, 0, 1, 74433, 32, 85848, 228465, 122, 0, 1, 1, 85848, 228465, 122, 0, 1,
      1, 955506, 213312, 0, 2, 270652, 22588, 4, 1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1,
      81663, 32, 59498, 32, 20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 43053543, 10, 53384111, 14333, 10,
      43574283, 26308, 10
    ]
    const PlutusV3 = [
      100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000, 100, 16000, 100, 16000,
      100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100, 94375, 32, 132994, 32, 61462, 4, 72010, 178, 0, 1,
      22151, 32, 91189, 769, 4, 2, 85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1, 1, 1000, 42921, 4, 2, 24548,
      29498, 38, 1, 898148, 27279, 1, 51775, 558, 1, 39184, 1000, 60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1,
      13169, 4, 22100, 10, 28999, 74, 1, 28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32, 72362, 32,
      7243, 32, 7391, 32, 11546, 32, 85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1, 90434, 519, 0, 1, 74433, 32,
      85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1, 1, 85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1,
      955506, 213312, 0, 2, 270652, 22588, 4, 1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663,
      32, 59498, 32, 20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 43053543, 10, 53384111, 14333, 10, 43574283,
      26308, 10, 16000, 100, 16000, 100, 962335, 18, 2780678, 6, 442008, 1, 52538055, 3756, 18, 267929, 18, 76433006,
      8868, 18, 52948122, 18, 1995836, 36, 3227919, 12, 901022, 1, 166917843, 4307, 36, 284546, 36, 158221314, 26549,
      36, 74698472, 36, 333849714, 1, 254006273, 72, 2174038, 72, 2261318, 64571, 4, 207616, 8310, 4, 1293828, 28716,
      63, 0, 1, 1006041, 43623, 251, 0, 1, 100181, 726, 719, 0, 1, 100181, 726, 719, 0, 1, 100181, 726, 719, 0, 1,
      107878, 680, 0, 1, 95336, 1, 281145, 18848, 0, 1, 180194, 159, 1, 1, 158519, 8942, 0, 1, 159378, 8813, 0, 1,
      107490, 3298, 1, 106057, 655, 1, 1964219, 24520, 3
    ]

    const costModelV1 = CardanoWasm.CostModel.new()
    PlutusV1.forEach((val, i) => {
      costModelV1.set(i, CardanoWasm.Int.from_str(val.toString()))
    })
    const costModelV2 = CardanoWasm.CostModel.new()
    PlutusV2.forEach((val, i) => {
      costModelV2.set(i, CardanoWasm.Int.from_str(val.toString()))
    })

    const costModelV3 = CardanoWasm.CostModel.new()
    PlutusV3.forEach((val, i) => {
      costModelV3.set(i, CardanoWasm.Int.from_str(val.toString()))
    })

    const costmdls = CardanoWasm.Costmdls.new()
    costmdls.insert(CardanoWasm.Language.new_plutus_v3(), costModelV3)
    costmdls.insert(CardanoWasm.Language.new_plutus_v2(), costModelV2)
    costmdls.insert(CardanoWasm.Language.new_plutus_v1(), costModelV1)
    return costmdls
  }

  const testBuildTxUsingContract = async () => {
    console.log('Start build tx using contract')
    /**
     * const utxoInput = {
          input: {
            transaction_id: '29c2fc715465f6280ef4abfb161710b0730f5142b0611f6c05a3f333cefacc75',
            index: 0
          },
          output: {
            address:
              'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
            amount: {
              coin: `${3000000}`,
              multiasset: null
            },
            plutus_data: null,
            script_ref: null,
            data_hash: null
          }
        }
    */
    const utxos = [
      {
        input: {
          transaction_id: '211a8d95c1106c314022f4b70d8deb982e6d35034a64c3435ca1bcd0e176453c',
          index: 1
        },
        output: {
          address:
            'addr_test1qr396vcmnu64m060pqk7qfldtn6edesgtckcr7gzw2m6qlknn6428g2wnvxyvq9n0rwk9zrkzmjgagrsc2tng927tckqja3ek5',
          amount: {
            coin: '71000000',
            multiasset: null
          },
          plutus_data: null,
          script_ref: null,
          data_hash: null
        }
      }
    ]

    const scriptUtxo = {
      input: {
        index: 0,
        transaction_id: '211a8d95c1106c314022f4b70d8deb982e6d35034a64c3435ca1bcd0e176453c'
      },
      output: {
        address: 'addr_test1wzd8rf443fq72vjljjkz528585zd7yvkv0vqzcjgpghc6vgvzk2ky',
        amount: {
          coin: String(3_000_000),
          multiasset: null
        },
        plutus_data: null,
        script_ref: null,
        data_hash: 'db362718c0aba8901f76c296237de0c53ffe9648d4c5d9a5195f7728ac1c0925'
      }
    }

    const collateral = {
      input: {
        transaction_id: '211a8d95c1106c314022f4b70d8deb982e6d35034a64c3435ca1bcd0e176453c',
        index: 1
      },
      output: {
        address:
          'addr_test1qr396vcmnu64m060pqk7qfldtn6edesgtckcr7gzw2m6qlknn6428g2wnvxyvq9n0rwk9zrkzmjgagrsc2tng927tckqja3ek5',
        amount: {
          coin: '71000000',
          multiasset: null
        },
        plutus_data: null,
        script_ref: null,
        data_hash: null
      }
    }

    console.log('1. Tạo UTXO')
    console.log('1.1. start Tạo script UTXO')
    const wasmScriptUtxos = CardanoWasm.TransactionUnspentOutputs.new()
    const scriptUtxoOutput = CardanoWasm.TransactionOutput.new(
      CardanoWasm.Address.from_bech32(scriptUtxo.output.address),
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(scriptUtxo.output.amount.coin))
    )
    scriptUtxoOutput.set_data_hash(CardanoWasm.DataHash.from_bytes(Buffer.from(scriptUtxo.output.data_hash, 'hex')))
    const txScriptInput = CardanoWasm.TransactionUnspentOutput.new(
      CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(scriptUtxo.input.transaction_id, 'hex')),
        scriptUtxo.input.index
      ),
      scriptUtxoOutput
    )
    wasmScriptUtxos.add(txScriptInput)
    console.log('1.1. end Tạo script UTXO', wasmScriptUtxos.to_js_value())

    console.log('1.2. start Tạo UTXO để trả phí')
    const wasmUtxos = CardanoWasm.TransactionUnspentOutputs.new()
    utxos.forEach(utxo => {
      wasmUtxos.add(CardanoWasm.TransactionUnspentOutput.from_json(JSON.stringify(utxo)))
    })
    console.log('1.2. end Tạo UTXO để trả phí', wasmUtxos.to_js_value())

    console.log('1.3. start Tạo UTXO thế chấp')
    const wasmCollateral = CardanoWasm.TransactionUnspentOutputs.new()
    wasmCollateral.add(CardanoWasm.TransactionUnspentOutput.from_json(JSON.stringify(collateral)))
    console.log('1.3. end Tạo UTXO thế chấp', wasmCollateral.to_js_value())

    const scriptCborHex =
      '590f6001010032323232323232322533300232323232325332330083001300937540042646464a664660186002601a6ea80084c8c8c8c8c94ccc044c8c8c94ccc050cc00d2f5c30120008101000081010100810102001bad3006301637540102a666028004200229405281980125eb8501010081010200810103001bad30063015375400e6600297ae110120008101000081010100810102001bad30033014375400c44646600200200644a66603000229404c94ccc058cdc39bad301b00200414a2266006006002603600220022940c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc0d0c0a4c0d4dd5000899192991919191919981da99981d9980d01c1bae3027303d3754604e607a6ea80bc528899981da514a094454ccc0ecc0d0dd69817181e9baa02f1533303b533303b3019375c6030607a6ea80bc4cc05cc058c0f4dd501c1bad3015303d375405e29405288a501533303b3004375a605c607a6ea80bc54ccc0ecc014dd69816181e9baa02f1533303b3005375a605a607a6ea80bc4c94ccc0f0c0c4c0f4dd5000899299981e9803181f1baa001132330140011533303e330130320011533303e3371e6eb8c06cc100dd50009bae301b304037540642a66607c66e1cdd6981898201baa001375a606260806ea80c854ccc0f8c018dd6981818201baa0011533303e3006375a602460806ea800454ccc0f8c014dd6980898201baa0011333010375a606060806ea8004dd6980918201baa001375c602a60806ea80045280a5014a029405280a503042303f37540022c6026607c6ea8c104c0f8dd50008b19980a00498061bad3013303d375405e604e607a6ea8c098c0f4dd50038a99981d9980b980b181e9baa038375a601c607a6ea80bc5288a50132533303c3031303d3754002264a66607a600c607c6ea80044c8cc05000454ccc0f8cc04c0c800454ccc0f8cdc79bae301b304037540026eb8c06cc100dd50190a99981f18021bad3031304037540022a66607c600c6eb4c0c0c100dd50008a99981f18029bad3012304037540022a66607c66e1cdd6980898201baa001375a602260806ea80c84ccc040dd6981818201baa001375a602460806ea8004dd7180a98201baa00114a029405280a5014a02940c108c0fcdd50008b1809981f1baa3041303e37540022c66602801260186eb4c04cc0f4dd50179813981e9baa3026303d375400e26601605e0122a666076a66607600c29444ccc0ed28a504a22a66607660686eb4c0b8c0f4dd5017899299981e1818981e9baa001132533303d3006303e3754002264660280022a66607c660260640022a66607c60386eb8c06cc100dd50190a99981f19981f180e1bae301b30403754002941288a99981f18039bad303130403754002266e1cdd6980c18201baa001375a603060806ea80c85280a5014a02940c108c0fcdd50008b1809981f1baa3041303e37540022c66602801260186eb4c04cc0f4dd50179813981e9baa3026303d375400e2a66607660086eb4c0b8c0f4dd50178a99981d98029bad302d303d375405e2a666076600a6eb4c0b0c0f4dd5017899299981e1818981e9baa001132533303d3006303e3754002264660280022a66607c660260640022a66607c66e3cdd7180d98201baa001375c603660806ea80c854ccc0f8cdc39bad3031304037540026eb4c0c4c100dd50190a99981f18031bad302f304037540022a66607c600a6eb4c064c100dd50008a99981f18029bad30113040375400226660206eb4c0bcc100dd50009bad3019304037540026eb8c06cc100dd50008a5014a029405280a5014a06084607e6ea800458c04cc0f8dd51820981f1baa00116333014009300c375a6026607a6ea80bcc09cc0f4dd51813181e9baa0071533303b330173016303d37540706eb4c038c0f4dd50178a5114a0264a6660786062607a6ea80044c94ccc0f4c018c0f8dd50008991980a0008a99981f198098190008a99981f19b8f375c603660806ea8004dd7180d98201baa0321533303e3004375a606260806ea800454ccc0f8c018dd6981798201baa0011533303e3005375a603260806ea800454ccc0f8cdc39bad3011304037540026eb4c044c100dd501909998081bad302f304037540026eb4c064c100dd50009bae301b3040375400229405280a5014a029405281821181f9baa001163013303e37546082607c6ea800458ccc050024c030dd69809981e9baa02f3027303d3754604c607a6ea801c4cc02c0bc02454ccc0ecc004dd69817181e9baa02f13300b02f00914a06e1d2006371090001b8948000dc3a40086e1d200133014032375c6042606e6ea8c080c0dcdd5014981c981b1baa001163301837586070004466ebcc080c0d8dd50008159bac3037303830380013033375405c44646464646464a64666072605c00e26464a666076666076600666602801400c00a941288a99981d99981d98018012504a226660766006002941288a5014a066602601200ea0366660240100080042a666072606400e264a666074666074600466602601200c00894128899981d1801000a504a22940ccc04802001940684c94ccc0e8ccc0e8c008ccc04c02401800d28251133303a30020014a0944528199809004003280d1baf4c0103d87a8000301730223039375400e602c604460706ea8018cdc1800a400866e04c014dd69806181b1baa00400133706600860086eb4c02cc0d4dd5001a41900264a6660666050002290000a99981998160008a40082900119b863370066e04dd69812181a1baa002375a604660686ea8009200648018dc12400844466e3cdc91b983372c6026006602600400246066606860686068606860686068606860686068606860680024606460666066606660666066606600244a66605a66ebcc064c0bcdd5000980c98179baa0021533302d3375e6030605e6ea8004c060c0bcdd50010a99981699b8f375c6008605e6ea8004dd7180218179baa0021533302d3370e6eb4c014c0bcdd50009bad3005302f3754004266e3cdd7180818179baa001375c6020605e6ea80085280a5014a02940894ccc0b0c084c0b4dd5001099191919191919191919191919191919191919191919191919192999824982600109981500c89981500b8a80d8b1bae304a001304a002375a609000260900046eb4c118004c118008dd6982200098220011bad30420013042002375a608000260800046eb4c0f8004c0f8008dd6981e000981e0011bad303a001303a002375c607000260700046eb8c0d8004c0d8008c0d0004c0d0008c0c8004c0b8dd50010b118179818181800091817181798179817981798179817981798179817800911198078019299981599b8900332533302c3025302d37540022900009bad3031302e375400264a666058604a605a6ea8004530103d87a80001323300100137566064605e6ea8008894ccc0c4004530103d87a800013232323253330323372291100002153330323371e9101000021301a33036375000297ae014c0103d87a8000133006006003375a60660066eb8c0c4008c0d4008c0cc004c8cc004004dd5980b98171baa00222533303000114c103d87a800013232323253330313372291100002153330313371e9101000021301933035374c00297ae014c0103d87a8000133006006003375660640066eb8c0c0008c0d0008c0c80044cdd7980b98169baa3017302d3754002602e605a6ea800852811816181698169816981698169816981698169816981680091815981618161816181618161816181600091192999813981018141baa0011337120046eb4c0b0c0a4dd50008a50301230283754602460506ea80088c0a4c0a8c0a8c0a80048c060dc68009119198008009bac30173026375400644a66605000229404c94ccc098cdc79bae302b00200414a2266006006002605600246600e60106eb8c034c08cdd50009bae300c3023375400226600a600c91011ce0b8f7a66c48dfec15b984cae1b934a78ee7a1285e18e695b0da0b0e0048811c641ea2fac76b108beb86880025d0a5469979e82988243ed69c2ee93f0023732660106ea0005221002302330243024302430243024302430243024302430243024302400122533301e3013301f3754004264646464a66604a60500042a00a2c6eb8c098004c098008dd7181200098101baa0021622323300100100322533302200114c103d87a8000132325333021300500213009330250024bd7009980200200098130011812000911802198101804180f1baa00233020300433020300433020300433020375200297ae04bd7025eb812f5c0460046603c60046603c6ea40052f5c06603c98103d87a80004bd701ba548000c0040048894ccc8cccc08400c4c8c8c8c8c8c8cc038008004cdc5245012800002533301e337100069007099b80483c80400c54ccc078cdc4001a410004266e00cdc0241002800690068b2999810000899b8a4881035b5d2900005133714911035b5f2000333300a00133714911025d2900005223330090090023006001223330090090020013758603c0046eb4c070004c8cdd81ba8301c001374e603a0026ea800c4c94ccc0780044cdc52441027b7d00003133714911037b5f200032323300100100322533302100110031533302130240011323330090093020001337149101023a2000333009009302100100430230011323330090093020001337149101023a20003330090093021001300633003003302500230230013371491102207d000033756006264a66603c002266e29221025b5d00003133714911035b5f2000333300800133714911015d000032233300700700230040012233300700700200137580066e292201022c2000133007375a0040022646466e2922010268270000132333001001337006e34009200133714911012700003222533301d3371000490000800899191919980300319b8000548004cdc599b80002533302033710004900a0a40c02903719b8b33700002a66604066e2000520141481805206e0043370c004901019b8300148080cdc70020011bae0022301b301c0012301a0012222323300100100522533301c00110051533301c301f001133003301e001005133004301e00133002002301f001223233001001003225333016300b00113371491101300000315333016337100029000099b8a489012d003300200233702900000089980299b8400148050cdc599b803370a002900a240c00066002002444a66602666e2400920001001133300300333708004900a19b8b3370066e140092014481800048c054c058c058c058c058c0580048c050c054c054c054c0540048c04cc050c050c050c050c050c050c050c050004c044c038dd50011b874800058c03cc040008c038004c028dd50011b874800858c02cc030008c028004c028008c020004c010dd50008a4c26cacae6955ceaab9e5573eae815d0aba257481'

    const signerHash = 'e25d331b9f355dbf4f082de027ed5cf596e6085e2d81f90272b7a07e'

    const txBuilder = getTxBuilder()

    txBuilder.add_inputs_from(wasmUtxos, CoinSelectionStrategyCIP2.LargestFirstMultiAsset)
    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(address.value)

    const feeAmount = '0'
    txBuilder.set_fee(CardanoWasm.BigNum.from_str(feeAmount))
    console.log('>>> / feeAmount:', feeAmount)

    // 3. Thêm đầu vào từ UTxO hợp đồng
    console.log('3. Thêm đầu vào từ UTxO hợp đồng')
    const scriptTxIn = CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(Buffer.from(scriptUtxo.input.transaction_id, 'hex')),
      scriptUtxo.input.index
    )
    // Tạo giá trị (value) từ scriptUtxo.output.amount
    const scriptValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(scriptUtxo.output.amount.coin))
    // Thêm đầu vào hợp đồng
    txBuilder.add_inputs_from(wasmScriptUtxos, CoinSelectionStrategyCIP2.LargestFirstMultiAsset)

    // 4. Thêm Plutus Script, Redeemer và Datum
    console.log('4. Thêm Plutus Script, Redeemer và Datum')
    // const plutusScript = CardanoWasm.PlutusScript.from_bytes(Buffer.from(scriptCborHex, 'hex'))
    const _plutusScript = CardanoWasm.PlutusScript.from_bytes_v3(Buffer.from(scriptCborHex, 'hex'))
    const plutusScripts = CardanoWasm.PlutusScripts.new()
    plutusScripts.add(_plutusScript)
    // console.log('>>> / plutusScripts:', plutusScripts.to_json())
    const scriptHash = _plutusScript.hash().to_hex()
    console.log('>>> / plutusScript Hash:', scriptHash)
    // const _scriptDataHash = CardanoWasm.ScriptDataHash.from_hex(
    //   '5e125e21548ed5812de0daf6ec9da06a1040f2b016a462e1d753981cc877f506'
    // )
    // console.log('>>> / _scriptDataHash:', _scriptDataHash.to_hex())
    // txBuilder.set_script_data_hash(_scriptDataHash)

    // Tạo redeemer: Con_0 [hex(message)]
    const message = 'Hello, World!'
    const plutusList = CardanoWasm.PlutusList.new()
    plutusList.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(stringToHex(message), 'hex')))

    const redeemerData = CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusList)
    )
    const redeemer = CardanoWasm.Redeemer.new(
      CardanoWasm.RedeemerTag.new_spend(),
      CardanoWasm.BigNum.from_str('0'), // Chỉ số đầu vào
      redeemerData,
      CardanoWasm.ExUnits.new(
        CardanoWasm.BigNum.from_str('10000000'), // Mem
        CardanoWasm.BigNum.from_str('300000000') // Steps
      )
    )
    const redeemers = CardanoWasm.Redeemers.new()
    redeemers.add(redeemer)

    // Tạo datum: Con_0 [signerHash]
    const inlineDatum = buildGameDatumInlineDatum({
      play_a: buildPlayerDatum(
        'e25d331b9f355dbf4f082de027ed5cf596e6085e2d81f90272b7a07e',
        'd39eaaa3a14e9b0c4600b378dd62887616e48ea070c29734155e5e2c'
      ),
      play_b: buildPlayerDatum(
        '6a3376ccfed0903916a7b09bbe4dcd4d66054090e34cca19f61d149b',
        'c7ee5404e71548b191905bd3d0a3ec3087e258c10ec7127e7d9c27f9'
      ),
      encoded_choice_a: 'cf3ff1a00fa1836509df654dd27e81bd2e64b6ee293b26a7b96817388e44a711',
      encoded_choice_b: '',
      revealed_choice_a: -1,
      revealed_choice_b: -1,
      salt_a: 0,
      salt_b: 0,
      status: 1,
      bet_amount: 3000000,
      unlock_join_time: 1747716210,
      unlock_revealed_time: 0,
      game_id: '0abc123'
    })
    const plutusListDatum = CardanoWasm.PlutusList.new()
    plutusListDatum.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(signerHash, 'hex')))

    // const datumData = CardanoWasm.PlutusData.new_constr_plutus_data(
    //   CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusListDatum)
    // )
    console.log('>>> / datumData Hash:', CardanoWasm.hash_plutus_data(inlineDatum).to_hex())

    // // Thêm Plutus Data (datum và redeemer)
    const plutusWitnesses = CardanoWasm.PlutusWitnesses.new()
    plutusWitnesses.add(CardanoWasm.PlutusWitness.new(_plutusScript, inlineDatum, redeemer))
    txBuilder.add_plutus_script_input(
      CardanoWasm.PlutusWitness.new(_plutusScript, inlineDatum, redeemer),
      scriptTxIn,
      scriptValue
    )

    // 5. Thêm Required Signer
    txBuilder.add_required_signer(CardanoWasm.Ed25519KeyHash.from_bytes(Buffer.from(signerHash, 'hex')))

    // 6. Thêm đầu ra (Change Address)
    const txOutput = CardanoWasm.TransactionOutput.new(
      CardanoWasm.Address.from_bech32(address.value),
      scriptValue // Ban đầu đặt giá trị bằng script value, sẽ điều chỉnh sau
    )
    txBuilder.add_output(txOutput)

    // 7. Thêm tài sản thế chấp (Collateral)
    console.log('7. Thêm tài sản thế chấp (Collateral)')
    const collateralTxIn = CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(Buffer.from(collateral.input.transaction_id, 'hex')),
      collateral.input.index
    )
    const collateralValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(collateral.output.amount.coin))
    const collateralAddress = CardanoWasm.Address.from_bech32(collateral.output.address)
    const collateralOutput = CardanoWasm.TxInputsBuilder.new()
    collateralOutput.add_regular_input(collateralAddress, collateralTxIn, collateralValue)
    txBuilder.set_collateral(collateralOutput)

    // 8. Chọn UTxO để trả phí
    // Da chon UTxO roi

    // 9. Cân bằng giao dịch
    console.log('9. Cân bằng giao dịch')
    txBuilder.add_change_if_needed(CardanoWasm.Address.from_bech32(address.value))

    // Build tx witness
    const txWitnessSet = CardanoWasm.TransactionWitnessSet.new()
    txWitnessSet.set_plutus_scripts(plutusScripts)
    const _plutusList = CardanoWasm.PlutusList.new()
    const _plutusDatum = CardanoWasm.PlutusData.from_hex(inlineDatum.to_hex())
    _plutusList.add(_plutusDatum)
    txWitnessSet.set_plutus_data(_plutusList)
    // txWitnessSet.set_redeemers(redeemers)

    const _auxiliaryData = CardanoWasm.AuxiliaryData.new()
    _auxiliaryData.set_plutus_scripts(plutusScripts)
    txBuilder.set_auxiliary_data(_auxiliaryData)

    const costMdls = buildCostModels()
    txBuilder.remove_script_data_hash()
    txBuilder.calc_script_data_hash(costMdls)

    // 10. Tính phí và hoàn tất giao dịch
    const txBody = txBuilder.build()
    const tx = CardanoWasm.Transaction.new(
      txBody,
      txWitnessSet,
      _auxiliaryData // Auxiliary data
    )

    // 11. Tạo giao dịch hoàn chỉnh (chưa ký)
    const txHex = Buffer.from(tx.to_bytes()).toString('hex')
    console.log('Transaction Hex:', txHex)

    console.log('>>> / txBody:', tx.body().to_js_value())

    // 12. Ký giao dịch

    const _privateSigningKey = auth
      .rootKey! // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // 0
      .derive(0) // key index: 0
      .to_raw_key()

    const getTxBodyHash = (txBody: any) => {
      const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
      return tx.transaction_hash()
    }
    const txHash = getTxBodyHash(txBody)
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, _privateSigningKey)
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new()
    vkeyWitnesses.add(vkeyWitness)

    const witnessSet = tx.witness_set()
    witnessSet.set_vkeys(vkeyWitnesses)

    // Tạo giao dịch hoàn chỉnh với txBody, witnessSet, và auxiliaryData
    const auxiliaryData = tx.auxiliary_data()
    const txSigned = CardanoWasm.Transaction.new(txBody, witnessSet, auxiliaryData)
    console.log('txSigned', txSigned.to_js_value(), txSigned.to_hex())
    const fullTxSize = txSigned.to_bytes().length
    console.log('fullTxSize', fullTxSize)

    const feeA = CardanoWasm.BigNum.from_str('44')
    const feeB = CardanoWasm.BigNum.from_str('155381')

    const fee = feeA.checked_mul(CardanoWasm.BigNum.from_str(fullTxSize.toString())).checked_add(feeB)

    console.log('Estimated fee (lovelace):', fee.to_str())
  }

  const testBuildTxLockContract = async () => {
    console.log('Start build tx lock contract')

    const utxos = [
      {
        input: {
          index: 5,
          transaction_id: 'ea66b6143f76c9fd934d17b72189ff75e12776c4277dbe54e38a066b1c7ed96c'
        },
        output: {
          address:
            'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0',
          amount: {
            coin: '25000000',
            multiasset: null
          },
          plutus_data: null,
          script_ref: null,
          data_hash: null
        }
      }
    ]

    const collateral = {
      input: {
        index: 5,
        transaction_id: 'ea66b6143f76c9fd934d17b72189ff75e12776c4277dbe54e38a066b1c7ed96c'
      },
      output: {
        address:
          'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0',
        amount: {
          coin: '25000000',
          multiasset: null
        },
        plutus_data: null,
        script_ref: null,
        data_hash: null
      }
    }

    const rootKey = _rootKey.value
    if (!rootKey) return
    const privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // 0
      .derive(0) // key index: 0
      .to_raw_key()
    const signerHash = privateSigningKey.to_public().hash().to_hex()
    console.log('>>> / signerHash:', signerHash)

    const scriptAddress = 'addr_test1wzd8rf443fq72vjljjkz528585zd7yvkv0vqzcjgpghc6vgvzk2ky'

    // Tạo datum: Con_0 [signerHash]
    // const plutusListDatum = CardanoWasm.PlutusList.new()
    // plutusListDatum.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(signerHash, 'hex')))

    // const datumData = CardanoWasm.PlutusData.new_constr_plutus_data(
    //   CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusListDatum)
    // )
    // console.log('>>> / datumData Hash:', CardanoWasm.hash_plutus_data(datumData).to_hex())

    const inlineDatum = buildGameDatumInlineDatum({
      play_a: buildPlayerDatum(
        'e25d331b9f355dbf4f082de027ed5cf596e6085e2d81f90272b7a07e',
        'd39eaaa3a14e9b0c4600b378dd62887616e48ea070c29734155e5e2c'
      ),
      play_b: buildPlayerDatum(
        '6a3376ccfed0903916a7b09bbe4dcd4d66054090e34cca19f61d149b',
        'c7ee5404e71548b191905bd3d0a3ec3087e258c10ec7127e7d9c27f9'
      ),
      encoded_choice_a: 'cf3ff1a00fa1836509df654dd27e81bd2e64b6ee293b26a7b96817388e44a711',
      encoded_choice_b: '',
      revealed_choice_a: -1,
      revealed_choice_b: -1,
      salt_a: 0,
      salt_b: 0,
      status: 1,
      bet_amount: 3000000,
      unlock_join_time: 1747716210,
      unlock_revealed_time: 0,
      game_id: '0abc123'
    })

    const bridge = getBridge()
    const { cborHex, txHash } = await bridge.createTransaction({
      toAddress: scriptAddress,
      txHash: 'e0467d6433ffa1738e8bd5c5b985e7d1dc5785aedd487e7a61e44f4099abe0d7#1',
      lovelace: '3000000',
      inlineDatum,
      datumHash: CardanoWasm.hash_plutus_data(inlineDatum).to_hex(),
      secret: {
        privateKey: privateSigningKey
      }
    })
    console.log('txCbor2', cborHex, txHash)
  }

  function buildGameDatumInlineDatum(datum: {
    play_a: CardanoWasm.PlutusData
    play_b: CardanoWasm.PlutusData
    encoded_choice_a: string
    encoded_choice_b: string
    revealed_choice_a: number
    revealed_choice_b: number
    salt_a: number
    salt_b: number
    status: number
    bet_amount: number
    unlock_join_time: number
    unlock_revealed_time: number
    game_id: string
  }) {
    const fields = CardanoWasm.PlutusList.new()

    fields.add(datum.play_a) // PlutusData
    fields.add(datum.play_b) // PlutusData

    fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.encoded_choice_a, 'hex')))
    fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.encoded_choice_b, 'hex')))

    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.revealed_choice_a.toString())))
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.revealed_choice_b.toString())))

    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.salt_a.toString())))
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.salt_b.toString())))

    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.status.toString())))
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.bet_amount.toString())))
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.unlock_join_time.toString())))
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.unlock_revealed_time.toString())))

    fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.game_id, 'hex')))

    return CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(
        CardanoWasm.BigNum.from_str('0'), // constructor index 0
        fields
      )
    )
  }

  function buildPlayerDatum(paymentCredential: string, stakeCredential: string) {
    const fields = CardanoWasm.PlutusList.new()

    fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(paymentCredential, 'hex')))
    fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(stakeCredential, 'hex')))

    return CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(
        CardanoWasm.BigNum.from_str('0'), // constructor index 0
        fields
      )
    )
  }

  const testBuildTxReset = async () => {
    console.log('Start build tx reset')

    const snapshotUtxo = (await hydraBridge.value?.querySnapshotUtxo()) || {}
    const myUtxos = Object.keys(snapshotUtxo)
      .filter(txId => {
        const utxo = snapshotUtxo[txId as TxHash]
        return utxo.address === address.value
      })
      .map(txId => txId as TxHash)

    const { cborHex } = await hydraBridge.value!.createTransactionWithMultiUTxO({
      txHashes: myUtxos,
      lovelace: '3000000',
      toAddress: address.value,
      inlineDatum: undefined,
      secret: {
        privateKey: getPrivateSigningKey()
      }
    })
    console.log('txCbor2', cborHex)
    // hydraBridge.value?.commands.newTx(cborHex)
  }

  const getPrivateSigningKey = () => {
    const rootKey = _rootKey.value
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      throw new Error('Root key is not found')
    }

    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })
    //
    console.log('Start build tx', hydraBridge.value)
    const privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // 0
      .derive(0) // key index: 0
      .to_raw_key()
    return privateSigningKey
  }

  const onAuth = (rootKey: typeof auth.rootKey) => {
    _rootKey.value = rootKey
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

    console.log('Enterprise Address: ', wallet.getEnterpriseAddress())
    console.log('Payment Address: ', wallet.getPaymentAddress())
    console.log('Used Address: ', wallet.getUsedAddress())

    // test
    const paymentKey = useWalletCore().getSigningKey(rootKey)
    const publicKey = useWalletCore().getVerificationKey(paymentKey)
    console.log('paymentKey: ', paymentKey.toJSON())
    console.log('publicKey: ', publicKey.toJSON())

    console.log('Xpriv', rootKey.to_bech32())
    console.log('Xpub', rootKey.to_public().to_bech32())
    console.log('Signer Hash', wallet.getAccount(0, 0).paymentKey.toPublic().hash().hex())

    address.value = wallet.getUsedAddress().toBech32()
    refetchLayer1Utxo()
  }

  const onRemoveAuth = () => {
    _rootKey.value = null
  }
</script>

<template>
  <div class="p-2">
    <a-row :gutter="48">
      <a-col :span="12" class="border-r-solid border-r">
        <div class="">
          <Authentication @auth="onAuth" @remove-auth="onRemoveAuth" />
          <div class="mt-1 flex">
            <div class="text-sm">Address: {{ formatId(address, 16, 10) }}</div>
            <div class="ml-4 text-sm">{{ derivePath.join('/') }}</div>
          </div>
          <div class="text-sm">Keyhash: {{ keyhash }}</div>
          <div class="flex items-center">UTXO selected: {{ selectedUtxoHashes.length }}</div>
          <div class="flex flex-wrap items-center gap-4">
            <ModalSelectUTxO :list-utxo="listUtxo" @select="onSelectUtxo" @refresh="refetchLayer1Utxo" />
            <a-button @click="onClickCommit()" class=""> Commit and Open head </a-button>

            <a-button @click="onClickEmptyCommit()" class=""> Empty Commit </a-button>
            <a-button @click="onClickDeposit()" class=""> Deposit UTxO </a-button>
          </div>
          <hr />
          <BlueprintCommit :listUtxo="listUtxo" />
          <hr />
          <!-- <div class="max-h-80 overflow-auto">
        <highlightjs language="js" class="text-10px w-full" :code="JSON.stringify(hydraUTxO, null, 2)" />
      </div> -->
          <div class="">
            <div class="flex items-center gap-2">
              <a-input v-model:value="cborHex" />
              <a-button @click="customSignTx()">SignTx</a-button>
            </div>
            <a-checkbox v-model:checked="partialSign">Partial Sign</a-checkbox>
            <div class="">
              <a-button @click="customSendTx()">Send TX</a-button>
            </div>
          </div>
          <hr />
          <div class="flex gap-3">
            <a-button @click="testBuildTxLockContract()">Build Tx Lock </a-button>
            <a-button @click="testBuildTxUsingContract()">Build Tx Unlock contract</a-button>
            <a-button @click="testBuildTxReset()">Build Tx reset</a-button>
          </div>
        </div>
        <div class="grid grid-cols-3">
          <div class="">
            <div class="mt-8">Get UTxO:</div>
            <a-button @click="getUtxoResponse()">Get UTxO</a-button>
          </div>
          <div class="">
            <div class="mt-8">Build tx:</div>
            <a-button @click="buildTx()">Build and Send</a-button>
          </div>
          <div class="">
            <div class="mt-8">Close head:</div>
            <a-button @click="closeHead()">Close</a-button>
          </div>
        </div>
        <GamePlay
          v-if="hydraBridge"
          :account-address="address"
          :account-derivation-path="derivePath"
          @update="getUtxoResponse()"
        />
      </a-col>
      <a-col :span="12">
        <div class="h-full overflow-auto">
          <DecommitFund />
          <hr />
          <SendToken />
          <hr />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<style lang="scss" scoped></style>
