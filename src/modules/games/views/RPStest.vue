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
  import plutus from '../resources/plutus.json'

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
    console.log('hydraUTxO', hydraUTxO.value)
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
      txHashes: ['9e17f16d132f2f0e89a918b55efdbb5274f7287fc94003de2ba0e65716422bea#1'],
      lovelace: '5000000',
      toAddress:
        'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
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
    const exUnitPrices = CardanoWasm.ExUnitPrices.from_json(
      JSON.stringify({
        mem_price: {
          numerator: '0',
          denominator: '1'
        },
        step_price: {
          numerator: '0',
          denominator: '1'
        }
      })
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
        CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('15'), CardanoWasm.BigNum.from_str('1'))
      )
      // .ref_script_coins_per_byte(
      //   CardanoWasm.UnitInterval.new(
      //     CardanoWasm.BigNum.from_str('15'), // 15 lovelace/byte khi full price unit là 1.000.000
      //     CardanoWasm.BigNum.from_str('1000000')
      //   ) // minFeeRefScriptCostPerByte
      // )
      .build()
    const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
    return txBuilder
  }

  // FIXME:
  const buildCostModels = () => {
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
    const costModel = CardanoWasm.CostModel.new()
    PlutusV3.forEach((val, i) => {
      costModel.set(i, CardanoWasm.Int.from_str(val.toString()))
    })
    const costmdls = CardanoWasm.Costmdls.new()
    costmdls.insert(CardanoWasm.Language.new_plutus_v3(), costModel)
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
          transaction_id: '85127274bbac57d52a5ba3cf0417d4792ff553134c1bcd2b740872ea599c1d85',
          index: 1
        },
        output: {
          address:
            'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
          amount: {
            coin: '15000000',
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
        transaction_id: '85127274bbac57d52a5ba3cf0417d4792ff553134c1bcd2b740872ea599c1d85'
      },
      output: {
        address: 'addr_test1wpws0hrjsyykjtm0k5jlxrjh9hksh8hqkj46qtf56ew7c9cla8dn2',
        amount: {
          coin: String(3_000_000),
          multiasset: null
        },
        plutus_data: null,
        script_ref: null,
        data_hash: '0eea8e3abecb068207c56b5f438098f460efaffde4935a7e90f3449676208fba'
      }
    }

    const collateral = {
      input: {
        transaction_id: '8ae08546511d2a8eb35994387cd3fb3deea86806914ecd6427ef7350334080be',
        index: 6
      },
      output: {
        address:
          'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
        amount: {
          coin: '5000000',
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
      '590f6d590f6a01010029800aba4aba2aba1aba0aab9faab9eaab9dab9a4888888896600264653001300800198041804800cdc3a400530080024888966002600460106ea800e2653001300d00198069807000cdc3a40009112cc004c004c030dd50014660026020601a6ea800a46022602460246024602460246024602460240032301130123012301230120019180898091809180918091809000a4444b3001325980099800a5eb8410120008101000081010100810102001bad30033012375400b15980099800a5eb850120008101000081010100810102001bad30023012375400b1330014bd708101010081010200810103001bad30043012375400b14a080822941010111919800800801912cc00400629422b30013370e6eb4c06000400e294626600400460320028099016466002444b3001337120049000440063300100399b840024805266e2ccdc019b85002480512060001400c80924444646600200200a44b30010018802c4c966002003133004301b002006899802980d80119801801800a032301b00140612301530160019ba54800244b300130073012375400513232332259800980d801c0162c80c0dd7180c0009bae3018002301800130133754005164045230153016301630163016301630163016301630163016301630160019119198008009bac30063014375400644b30010018a508acc004cdc79bae30180010038a51899801001180c800a0264059224a32301530163016301630163016301630160019180a980b180b180b180b180b180b180b180b180b180b000c8c054c058c058c058c058c058c058c058c058c0580064602a602c602c003230153016301630160019180a980b180b180b180b180b180b000c8c054c058c058c058c058c058c058c058c058c058c058c0580066e09200498089baa00948888888888888888a600260220232300f33025300f33025375200297ae0330254c103d87a80004bd70488c040cc098c09cc090dd5001198131808198131808198131808198131ba90014bd7025eb812f5c097ae0911919800800801912cc0040062980103d87a80008992cc004c010006260266605200297ae08998018019815801204a3029001409d2259800980c18119baa0028991919191919191919191919194c004dd7181a000cc0d00326eb8c0d002e6eb8c0d002a6eb4c0d00266eb4c0d00226eb4c0d001e6eb4c0d001a6eb4c0d00166eb4c0d00126eb4c0d000e6eb4c0d0009222222222222598009820806c4cc0a0c1000644cc0a002c06a2c81f060680026066002606400260620026060002605e002605c002605a002605800260560026054002605200260486ea800a2c811244b30013375e604e60486ea8004c09cc090dd5001456600266ebcc044c090dd5000980898121baa0028acc004cdc79bae3008302437540026eb8c020c090dd5001456600266e1cdd6980498121baa001375a601260486ea800a266e3cdd7180718121baa001375c601c60486ea800a2941022452820448a50408914a081126eb0c094c098c09800522222229800911919800800801912cc004c084006266e292210130000038acc004cdc4000a40011337149101012d0033002002337029000000c4cc02ccdc2000a402866e2ccdc019b8500148051206000340ac815a26600a600c91011ce0b8f7a66c48dfec15b984cae1b934a78ee7a1285e18e695b0da0b0e0048811c641ea2fac76b108beb86880025d0a5469979e82988243ed69c2ee93f0091980318039bae302d302a37540026eb8c05cc0a8dd5000c888cc01c00c96600266e2400cc966002604e605a6ea80062900044dd6981898171baa00140b064b30013027302d375400314c103d87a8000899198008009bab3032302f375400444b30010018a6103d87a8000899192cc004cdc8a45000018acc004cdc7a441000018980f1981a181900125eb82298103d87a800040c1133004004303600340c06eb8c0c0004c0cc0050312058323300100137566036605c6ea8008896600200314c103d87a8000899192cc004cdc8a45000018acc004cdc7a441000018980e99819981880125eb82298103d87a800040bd133004004303500340bc6eb8c0bc004c0c800503044cdd7981818169baa3030302d37540026060605a6ea800a294102b4cc010dd61816004119baf302d302a37540020409111119191919912cc004c09cc0c8dd5003466002606c60666ea801a6e1d20019b87480126e2520009b88480026e1d2006488888966002b300133022031375c607860726ea8c0f0c0e4dd50164528c66002946942945037206e8acc004c0c8dd69815981c9baa02c8acc004cc084c080c0e4dd50189bad301f3039375405914a314a081ba2b30013004375a605660726ea80b22b30013005375a605260726ea80b22b30013005375a605460726ea80b2264b3001302e30393754003132598009803181d1baa0018991980b0008acc004cc0540bc0062b30013371e6eb8c07cc0f0dd50009bae301f303c375405f15980099b87375a605c60786ea8004dd69817181e1baa02f8acc004c018dd69816981e1baa0018acc004c018dd6980f181e1baa0018acc004c014dd6980e981e1baa0018cc004dd69816981e1baa0019bad301e303c3754003375c604060786ea800500b452820748a5040e914a081d2294103a452820748a5040e8607c60766ea80062c81c8c078c0e8dd5181e981d1baa0018b20709800808cc064dd6980f181c9baa02c981e181c9baa30263039375400c806a2b3001330213020303937540626eb4c068c0e4dd50164528c528206e40dd132598009817181c9baa0018992cc004c018c0e8dd5000c4c8cc0580045660026602a05e00315980099b8f375c603e60786ea8004dd7180f981e1baa02f8acc004c010dd69817181e1baa0018acc004c018dd69816981e1baa0018acc004c014dd6980f181e1baa0018acc004cdc39bad301d303c37540026eb4c074c0f0dd5017c660026eb4c0b4c0f0dd5000cdd6980f181e1baa0019bae3020303c3754002805a294103a452820748a5040e914a081d2294103a45282074303e303b37540031640e4603c60746ea8c0f4c0e8dd5000c590384c00404660326eb4c078c0e4dd50164c0f0c0e4dd51813181c9baa006403481ba26600e05802281b90374566002b300133022031375c607860726ea8c098c0e4dd50164528c66002946942945037206e8acc004c0c8dd69815981c9baa02c8992cc004c0b8c0e4dd5000c4c966002600c60746ea80062646602c0022b30013301502f0018acc004c01cdd69817181e1baa001899b87375a604460786ea8004dd69811181e1baa02f8a5040e914a081d0c0f8c0ecdd5000c59039180f181d1baa303d303a37540031640e13001011980c9bad301e30393754059303c30393754604c60726ea801900d456600260086eb4c0acc0e4dd50164566002600a6eb4c0a8c0e4dd50164566002600a6eb4c0a4c0e4dd501644c966002605c60726ea8006264b30013006303a3754003132330160011598009980a817800c56600266e3cdd7180f981e1baa001375c603e60786ea80be2b30013370e6eb4c0b8c0f0dd50009bad302e303c375405f15980098031bad302c303c375400315980098029bad3023303c375400315980098029bad301d303c3754003198009bad302c303c3754003375a604660786ea80066eb8c07cc0f0dd5000a0168a5040e914a081d2294103a452820748a5040e914a081d0c0f8c0ecdd5000c59039180f181d1baa303d303a37540031640e13001011980c9bad301e30393754059303c30393754604c60726ea801900d456600266042604060726ea80c4dd6980d181c9baa02c8a518a5040dc81ba264b3001302e30393754003132598009803181d1baa0018991980b0008acc004cc0540bc0062b30013371e6eb8c07cc0f0dd50009bae301f303c375405f15980098021bad302e303c375400315980098031bad302c303c375400315980098029bad3023303c375400315980099b87375a603a60786ea8004dd6980e981e1baa02f8cc004dd69816181e1baa0019bad3023303c3754003375c603e60786ea800500b452820748a5040e914a081d2294103a452820748a5040e8607c60766ea80062c81c8c078c0e8dd5181e981d1baa0018b20709800808cc064dd6980f181c9baa02c981e181c9baa30263039375400c806903744cc01c0b0045037206e8acc004c004dd69815981c9baa02c899803816008c528206e40dc81b91640c444466e3cdc91b983372c6008006600800400245300132598009814000c520008acc004c0b40062900245200240c88190cdc319b80337026eb4c090c0ccdd50011bad30233033375400490032400d33706602660266eb4c060c0ccdd5001241900330083036303337540053008302030333754005375e980103d87a8000488888c8c966002605c00f159800cc004c00e6002011001802a01ca50a5140e1159800cc004c00e6002011001802201ca50a5140e1198009801cc00402200d501040394a14a281c22941038452820708acc004c0cc01e2b300198009801cc00402200500540394a14a281c23300130039800804401aa0208072942945038452820708acc006600260073001008801401100e528528a0708cc004c00e6002011006a808201ca50a5140e114a081c1038207033706002900219b813018375a603a60706ea801c01046e64cc008dd4000a4410030010012223259800801c4c8c8cc88cc034008cdc5244101280059800800c4cdc52441035b5d2900006899b8a489035b5f20009800800ccdc52441025d2900006914c00402a00530070014029229800805400a0028051024206e5980099b880014803a266e0120f2010018acc004cdc4000a41000513370066e01208014001480362c81910321bac3034002375a60640026466ec0dd418190009ba73033001375400713259800800c4cdc52441027b7d00003899b8a489037b5f20003232330010010032259800800c400e264b30010018994c00402a606e003337149101023a200098008054c0e000600a805100a181d00144ca6002015303700199b8a489023a200098008054c0e0006600e66008008004805100a181d0012070303a00140dc66e29220102207d0000340d06eac00e264b3001001899b8a489025b5d00003899b8a489035b5f20009800800ccdc52441015d00003914c00401e0053004001401d229800803c00a002803902120683758007133009375a0060051323371491102682700329800800ccdc01b8d0024800666e292210127000044004444b3001337100049000440062646645300100699b800054800666e2ccdc00012cc004cdc40012402914818229037206e3371666e000056600266e2000520148a40c11481b9037002200c33706002901019b8600148080cdc70020012068375c00681b8dc5245022c2000114a0807916402c3009375400716401c300800130033754013149a26cac80081'
    const expectedScriptHash = '5d07dc728109692f6fb525f30e572ded0b9ee0b4aba02d34d65dec17'

    const signerHash = 'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf'

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
    const plutusScript = CardanoWasm.PlutusScript.from_bytes_v3(Buffer.from(scriptCborHex, 'hex'))
    const plutusScripts = CardanoWasm.PlutusScripts.new()
    plutusScripts.add(plutusScript)
    const scriptHash = plutusScript.hash().to_hex()
    console.log('>>> / plutusScript Hash:', scriptHash)
    if (scriptHash !== expectedScriptHash) {
      console.error('Script hash mismatch, expected:', expectedScriptHash, 'actual:', scriptHash)
      throw new Error('Script hash mismatch')
    }

    // // // Tạo redeemer: Con_0 [hex(message)]
    // const message = 'Hello, World!'
    // const plutusList = CardanoWasm.PlutusList.new()
    // plutusList.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(stringToHex('test_pass'), 'hex')))
    // const redeemerData = CardanoWasm.PlutusData.new_constr_plutus_data(
    //   CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusList)
    // )

    const redeemerData = CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('0'))

    const redeemer = CardanoWasm.Redeemer.new(
      CardanoWasm.RedeemerTag.new_spend(),
      CardanoWasm.BigNum.from_str('0'), // Chỉ số đầu vào
      redeemerData,
      CardanoWasm.ExUnits.new(
        CardanoWasm.BigNum.from_str('14000000'), // Mem
        CardanoWasm.BigNum.from_str('10000000000') // Steps
      )
    )
    const redeemers = CardanoWasm.Redeemers.new()
    redeemers.add(redeemer)

    // // Tạo datum: Con_0 [signerHash]
    // const buildDatum = () => {
    //   const fields = CardanoWasm.PlutusList.new()

    //   const passwordHash = '1b4f7f7358bd76170e178a83cf89e50867ee9a5fd9c7f1a31923479d26f0f01a'
    //   fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(passwordHash, 'hex')))

    //   return CardanoWasm.PlutusData.new_constr_plutus_data(
    //     CardanoWasm.ConstrPlutusData.new(
    //       CardanoWasm.BigNum.from_str('0'), // constructor index 0
    //       fields
    //     )
    //   )
    // }
    const datum = buildGameDatumInlineDatum({
      play_a: buildPlayerDatum(
        'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf',
        'eee790c7bb9c497f716fcec7d92a4d68c27b48c9e301b7c547c653cd'
      ),
      play_b: buildPlayerDatum(
        '6a3376ccfed0903916a7b09bbe4dcd4d66054090e34cca19f61d149b',
        'c7ee5404e71548b191905bd3d0a3ec3087e258c10ec7127e7d9c27f9'
      ),
      encoded_choice_a: '6162633132336168696869686568656a716b',
      encoded_choice_b: '',
      revealed_choice_a: -1,
      revealed_choice_b: -1,
      salt_a: 0,
      salt_b: 0,
      status: 1,
      bet_amount: 3000000,
      unlock_at: 1747716210,
      unlock_revealed_time: 0,
      game_id: '6162633132336168696869686568656a716b'
    })
    console.log('>>> / datum hex:', datum.to_hex())

    console.log('>>> / datumData Hash:', CardanoWasm.hash_plutus_data(datum).to_hex())

    // Thêm Plutus Data (datum và redeemer)
    const plutusWitnesses = CardanoWasm.PlutusWitnesses.new()
    plutusWitnesses.add(CardanoWasm.PlutusWitness.new(plutusScript, datum, redeemer))
    txBuilder.add_plutus_script_input(
      CardanoWasm.PlutusWitness.new(plutusScript, datum, redeemer),
      scriptTxIn,
      scriptValue
    )

    // 5. Thêm Required Signer
    console.log('5. Thêm Required Signer')
    txBuilder.add_required_signer(CardanoWasm.Ed25519KeyHash.from_bytes(Buffer.from(signerHash, 'hex')))
    console.log('>>> / Required Signer:', txBuilder.build().required_signers()?.to_js_value())

    // 6. Thêm đầu ra (Change Address)
    console.log('6. Thêm đầu ra (Change Address)')
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
    const _plutusDatum = CardanoWasm.PlutusData.from_hex(datum.to_hex())
    _plutusList.add(_plutusDatum)
    txWitnessSet.set_plutus_data(_plutusList)
    txWitnessSet.set_redeemers(redeemers)

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
    const rootKey = _rootKey.value
    if (!rootKey) return
    const _privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
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

    const scriptAddress = 'addr_test1wqrvlz59j2m7yyafn8hr3q9nm9nsd39ku97memmuwdadkjcsy5wtp'

    // Tạo datum: Con_0 [signerHash]
    // const plutusListDatum = CardanoWasm.PlutusList.new()
    // plutusListDatum.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(signerHash, 'hex')))

    // const datumData = CardanoWasm.PlutusData.new_constr_plutus_data(
    //   CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusListDatum)
    // )
    // console.log('>>> / datumData Hash:', CardanoWasm.hash_plutus_data(datumData).to_hex())

    const inlineDatum = buildGameDatumInlineDatum({
      play_a: buildPlayerDatum(
        'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf',
        'eee790c7bb9c497f716fcec7d92a4d68c27b48c9e301b7c547c653cd'
      ),
      play_b: buildPlayerDatum(
        '6a3376ccfed0903916a7b09bbe4dcd4d66054090e34cca19f61d149b',
        'c7ee5404e71548b191905bd3d0a3ec3087e258c10ec7127e7d9c27f9'
      ),
      encoded_choice_a: '6162633132336168696869686568656a716b',
      encoded_choice_b: '',
      revealed_choice_a: -1,
      revealed_choice_b: -1,
      salt_a: 0,
      salt_b: 0,
      status: 1,
      bet_amount: 3000000,
      unlock_at: 1747716210,
      unlock_revealed_time: 0,
      game_id: '6162633132336168696869686568656a716b'
    })
    const buildDatum = () => {
      const fields = CardanoWasm.PlutusList.new()

      const passwordHash = '1b4f7f7358bd76170e178a83cf89e50867ee9a5fd9c7f1a31923479d26f0f01a'
      fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(passwordHash, 'hex')))

      return CardanoWasm.PlutusData.new_constr_plutus_data(
        CardanoWasm.ConstrPlutusData.new(
          CardanoWasm.BigNum.from_str('0'), // constructor index 0
          fields
        )
      )
    }
    // const inlineDatum = buildDatum()
    console.log('>>> / inlineDatum Hash:', inlineDatum.to_hex())

    const bridge = getBridge()
    const { cborHex, txHash } = await bridge.createTransaction({
      toAddress: 'addr_test1wpws0hrjsyykjtm0k5jlxrjh9hksh8hqkj46qtf56ew7c9cla8dn2',
      txHash: 'ce1e42c83aaddd5b493fec44a0165f1cdb13515e01869612cba2336c1de38c35#1',
      lovelace: '3000000',
      // inlineDatum: inlineDatum,
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
    unlock_at: number
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
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.unlock_at.toString())))
    fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.unlock_revealed_time.toString())))

    fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.game_id, 'hex')))

    const plutusData = CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(
        CardanoWasm.BigNum.from_str('0'), // constructor index 0
        fields
      )
    )
    console.log('>>> / plutusData Hash:', CardanoWasm.hash_plutus_data(plutusData).to_hex())
    console.log('>>> / plutusData Hex:', plutusData.to_hex())
    return plutusData
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
