<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import { useRpsStore } from '../stores/rpsStore'
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
  import { CoinSelectionStrategyCIP2 } from '@emurgo/cardano-serialization-lib-browser'
  import { stringToHex } from '@/lib/utils/parser'
  import { HexBlob, PlutusV3Script } from '@/lib/types'
  import BlueprintCommit from '../components/playground/BlueprintCommit.vue'
  import SendToken from '../components/playground/SendToken.vue'
  import DecommitFund from '../components/playground/DecommitFund.vue'

  const rpsStore = useRpsStore()
  const { hydraBridge } = storeToRefs(rpsStore)

  const route = useRoute()

  onMounted(async () => {
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
    const walletId = currentWallet.value?.id as string
    refetchLayer1Utxo()
    rpsStore.initSocketConnection()
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

    const { cborHex } = await hydraBridge.value!.createTransactionWithMultiUTxO({
      txHashes: ['b03fe65bbd9585b883ed9ad77f101c5292bde4dece324a33b659a0d288ecf90e#0'],
      lovelace: '5000000',
      toAddress: address.value,
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
      CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('1')), // mem: 0 -> 1
      CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('1')) // steps: 0 -> 1
    )
    const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
      .fee_algo(linearFee)
      .pool_deposit(CardanoWasm.BigNum.from_str('500000000')) // stakePoolDeposit
      .key_deposit(CardanoWasm.BigNum.from_str('2000000')) // stakeAddressDeposit
      .max_value_size(5000) // maxValueSize
      .max_tx_size(16384) // maxTxSize
      .coins_per_utxo_byte(CardanoWasm.BigNum.from_str('4310'))
      .ex_unit_prices(exUnitPrices)
      .ref_script_coins_per_byte(
        CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('15'))
      )
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
          index: 0,
          transaction_id: '840740696b8f472612ff69ab6cd873e8954b91be61c71383bcea89f2dc6d49ea'
        },
        output: {
          address:
            'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
          amount: {
            coin: '7830187',
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
        transaction_id: '840740696b8f472612ff69ab6cd873e8954b91be61c71383bcea89f2dc6d49ea',
        index: 0
      },
      output: {
        address: 'addr_test1wqjfncaxftjz9zs7v08x7ycmy72g0ktcpufj5p5cazclpusefvj5t',
        amount: {
          coin: '1000000',
          multiasset: null
        },
        plutus_data: null,
        script_ref: null,
        data_hash: '5a291140a8f5e3f912fb8e08103f3a7bb12851495969cddc784f206179c67fa4'
      }
    }

    const collateral = {
      input: {
        transaction_id: '2db4bb9c68cb818aff11860cc46e4b60afedf874d82a79912892d3a7b53043b6',
        index: 0
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

    const scriptCbor =
      '59010959010601010029800aba2aba1aab9faab9eaab9dab9a48888896600264646644b30013370e900118031baa00189919912cc004cdc3a400060126ea801626464b3001300f0028acc004cdc3a400060166ea800e2b30013371e6eb8c038c030dd5003a450d48656c6c6f2c20576f726c642100899199119801001000912cc00400629422b30013371e6eb8c04400400e2946266004004602400280690101bac300f30103010301030103010301030103010300d3754601e0146eb8c038c030dd5180718061baa0038a5040291640291640346eb8c034004c028dd5002c5900818050009805180580098039baa0018b200a30070013007300800130070013003375400f149a26cac80081'

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
    // const plutusScript = CardanoWasm.PlutusScript.from_bytes(Buffer.from(scriptCbor, 'hex'))
    const _plutusScript = CardanoWasm.PlutusScript.from_bytes_v3(Buffer.from(scriptCbor, 'hex'))
    const plutusScripts = CardanoWasm.PlutusScripts.new()
    plutusScripts.add(_plutusScript)
    // console.log('>>> / plutusScripts:', plutusScripts.to_json())
    console.log('>>> / plutusScript Hash:', _plutusScript.hash().to_hex())
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
    const plutusListDatum = CardanoWasm.PlutusList.new()
    plutusListDatum.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(signerHash, 'hex')))

    const datumData = CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusListDatum)
    )
    console.log('>>> / datumData Hash:', CardanoWasm.hash_plutus_data(datumData).to_hex())

    // // Thêm Plutus Data (datum và redeemer)
    const plutusWitnesses = CardanoWasm.PlutusWitnesses.new()
    plutusWitnesses.add(CardanoWasm.PlutusWitness.new(_plutusScript, datumData, redeemer))
    txBuilder.add_plutus_script_input(
      CardanoWasm.PlutusWitness.new(_plutusScript, datumData, redeemer),
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
    const _plutusDatum = CardanoWasm.PlutusData.from_hex(datumData.to_hex())
    _plutusList.add(_plutusDatum)
    txWitnessSet.set_plutus_data(_plutusList)
    txWitnessSet.set_redeemers(redeemers)

    const _auxiliaryData = CardanoWasm.AuxiliaryData.new()
    _auxiliaryData.set_plutus_scripts(plutusScripts)
    txBuilder.set_auxiliary_data(_auxiliaryData)

    const costMdls = buildCostModels()
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
  }

  const testBuildTxLockContract = async () => {
    console.log('Start build tx lock contract')

    const utxos = [
      {
        input: {
          index: 1,
          transaction_id: '2db4bb9c68cb818aff11860cc46e4b60afedf874d82a79912892d3a7b53043b6'
        },
        output: {
          address:
            'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
          amount: {
            coin: '8830187',
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
        transaction_id: '2db4bb9c68cb818aff11860cc46e4b60afedf874d82a79912892d3a7b53043b6',
        index: 0
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

    const { rootKey } = auth
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

    const scriptAddress = 'addr_test1wqjfncaxftjz9zs7v08x7ycmy72g0ktcpufj5p5cazclpusefvj5t'

    // Tạo datum: Con_0 [signerHash]
    const plutusListDatum = CardanoWasm.PlutusList.new()
    plutusListDatum.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(signerHash, 'hex')))

    const datumData = CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusListDatum)
    )
    console.log('>>> / datumData Hash:', CardanoWasm.hash_plutus_data(datumData).to_hex())

    const bridge = getBridge()
    const { cborHex, txHash } = await bridge.createTransaction({
      toAddress: scriptAddress,
      txHash: '2db4bb9c68cb818aff11860cc46e4b60afedf874d82a79912892d3a7b53043b6#1',
      lovelace: '1000000',
      inlineDatum: undefined,
      datumHash: CardanoWasm.hash_plutus_data(datumData).to_hex(),
      secret: {
        privateKey: privateSigningKey
      }
    })
    console.log('txCbor2', cborHex, txHash)
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
    const rootKey = auth.rootKey
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
</script>

<template>
  <div class="p-2">
    <a-row :gutter="48">
      <a-col :span="12" class="border-r-solid border-r">
        <div class="">
          <div class="flex">
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
