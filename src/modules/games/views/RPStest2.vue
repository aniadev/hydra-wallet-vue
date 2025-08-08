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
  import {
    buildGameDatumInlineDatum,
    buildPlayerDatum,
    buildTxLockContract_2,
    deserializeAddressCredential
  } from '../playground/contract-tx-builder'

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
    filteredUTxO.value = toRaw(hydraUTxO.value)
    console.log('hydraUTxO', JSON.stringify(hydraUTxO.value, null, 1))
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
    const linearFee = CardanoWasm.LinearFee.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('0'))
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

  const contract = reactive({
    cborHex:
      '585e585c01010029800aba2aba1aab9eaab9dab9a4888896600264653001300600198031803800cc0180092225980099b8748008c01cdd500144c8cc892898050009805180580098041baa0028b200c180300098019baa0068a4d13656400401',
    address: 'addr_test1wrf8enqnl26m0q5cfg73lxf4xxtu5x5phcrfjs0lcqp7uagh2hm3k',
    hash: 'd27ccc13fab5b782984a3d1f99353197ca1a81be069941ffc003ee75'
  })

  const tx1 = reactive({
    input: ''
  })
  const testBuildTxLockContract_1 = async () => {
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

    const inlineDatum = buildGameDatumInlineDatum({
      play_a: buildPlayerDatum(
        '3969ae4e255d5150f5c27d0251d8129241e1fdb28873cad1a229fcda',
        'fc6beb57c9451fc1018755f470950eac27085ba9475cb08b5d314b5a'
      ),
      play_b: buildPlayerDatum(
        'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf',
        'eee790c7bb9c497f716fcec7d92a4d68c27b48c9e301b7c547c653cd'
      ),
      encoded_choice_a: '265d94569431f75f1864cb573789807f5a6276a47c8044c37ab3ba276d72dd5b',
      encoded_choice_b: '',
      revealed_choice_a: -1,
      revealed_choice_b: -1,
      salt_a: 0,
      salt_b: 0,
      status: 1,
      bet_amount: 2000000,
      unlock_join_time: 0,
      unlock_revealed_time: 0,
      game_id: '61306232366234352d363461302d343966382d623232652d373566626338303465343163'
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
      toAddress: contract.address,
      txHash: tx1.input as TxHash,
      lovelace: '2000000',
      inlineDatum: inlineDatum,
      // datumHash: CardanoWasm.hash_plutus_data(inlineDatum).to_hex(),
      secret: {
        privateKey: privateSigningKey
      }
    })
    console.log('txCbor2', cborHex, txHash)
  }

  const testBuildTxLockContract_2 = async () => {
    const rootKey = _rootKey.value
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }
    const txBuilder = getTxBuilder()
    buildTxLockContract_2({
      contract,
      txBuilder,
      rootKey
    })
  }

  const testBuildTxLockContract_3 = async () => {
    const rootKey = _rootKey.value
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }
    const txBuilder = getTxBuilder()
    // buildTxLockContract_3({
    //   contract,
    //   txBuilder,
    //   rootKey
    // })
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
    const { paymentCredential, stakeCredential } = deserializeAddressCredential(address.value)
    console.log('>>> / paymentCredential, stakeCredential:', paymentCredential, stakeCredential)

    refetchLayer1Utxo()
  }

  const onRemoveAuth = () => {
    _rootKey.value = null
  }

  const filterAddress = ref('')
  const filteredUTxO = ref({})
  const filterUTxO = () => {
    if (!filterAddress.value) {
      filteredUTxO.value = toRaw(hydraUTxO.value)
      return
    }
    filteredUTxO.value = Object.entries(hydraUTxO.value)
      .filter(([_, utxo]) => utxo.address.includes(filterAddress.value))
      .reduce((acc, [txId, utxo]) => {
        acc[txId as TxHash] = utxo
        return acc
      }, {} as UTxOObject)
  }

  // Blueprint test
  const blueprintForm = reactive({
    amount: ''
  })

  function buildBlueprintCommitTx() {
    const rootKey = _rootKey.value
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }
    if (!blueprintForm.amount) {
      message.error('Enter amount first')
      return
    }

    if (!selectedUtxoHashes.value.length) {
      message.error('Select utxo first')
      return
    }
    const commitUtxos = selectedUtxos.value.reduce((acc, item) => {
      if (!item.utxo) return acc
      acc[`${item.txId}#${item.txIndex}`] = item.utxo
      return acc
    }, {} as UTxOObject)

    console.log('commitUtxos', commitUtxos)
    const txBuilder = getTxBuilder()

    selectedUtxos.value.forEach(utxo => {
      const txInput = CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.txId, 'hex')),
        Number(utxo.txIndex)
      )
      const address = CardanoWasm.Address.from_bech32(utxo.utxo!.address)
      const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(`${utxo.utxo!.value.lovelace}`))
      txBuilder.add_regular_input(address, txInput, value)
    })

    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(address.value)
    const txOutput1 = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(blueprintForm.amount))
    )
    txBuilder.add_output(txOutput1)
    txBuilder.set_fee(CardanoWasm.BigNum.zero())

    txBuilder.add_change_if_needed(shelleyOutputAddress)
    const tx = txBuilder.build_tx()
    console.log('tx', tx.to_js_value(), tx.to_hex())
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
          <div class="space-y-1">
            <a-input v-model:value="blueprintForm.amount" placeholder="Blueprint commit amount" />
            <a-button @click="buildBlueprintCommitTx()">Build blueprint tx</a-button>
          </div>
          <hr />
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
          <hr />

          <div class="mt-2 flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <a-input v-model:value="tx1.input" placeholder="UTxO input hash" />
              <a-button @click="testBuildTxLockContract_1()" type="primary">Build Tx Lock 1</a-button>
            </div>
            <a-button @click="testBuildTxLockContract_2()" type="primary">Build Tx Lock 2</a-button>
          </div>
        </div>
      </a-col>
      <a-col :span="12">
        <div class="h-full overflow-auto">
          <!-- <div class="space-y-2">
            <a-textarea v-model:value="contract.cborHex" placeholder="Contract CBOR Hex" :rows="4" allow-clear />
            <a-textarea v-model:value="contract.address" placeholder="Contract address" :rows="4" allow-clear />
            <a-input v-model:value="contract.hash" placeholder="Contract hash" />
          </div> -->
          <DecommitFund />
          <hr />
          <div class="max-h-80 overflow-auto">
            <highlightjs language="js" class="text-10px w-full" :code="JSON.stringify(filteredUTxO, null, 1)" />
          </div>
          <div class="space-y-1">
            <a-input v-model:value="filterAddress" placeholder="Filter address" />
            <a-button @click="filterUTxO()">Filter UTxO</a-button>
          </div>
          <hr />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<style lang="scss" scoped></style>
