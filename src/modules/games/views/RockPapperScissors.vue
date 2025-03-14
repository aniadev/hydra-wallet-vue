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
  import { useCopy } from '@/utils/useCopy'
  import ModalSelectUTxO from '../components/ModalSelectUTxO.vue'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { HydraBridge } from '@/lib/hydra-bridge'
  import { HydraCommand, HydraHeadStatus, HydraHeadTag, type HydraPayload } from '@/lib/hydra-bridge/types/payload.type'
  import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'
  import GamePlay from '../components/GamePlay.vue'
  import type { HexcoreRepository } from '@/repositories/hexcore'

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

    address.value = wallet.getUsedAddress().toBech32()
    const walletId = currentWallet.value?.id as string
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
    selectedUtxo.value = listUtxo.value[0]

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

  const selectedUtxo = ref<{ txId: string; txIndex: number; utxo: UTxOObjectValue } | null>(null)
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
    const signedCborHex = await wallet.signTx(
      '84a800d9010284825820198d3af1af7a1b34f58f93d19a2351f47c7f34477a58d34f8051d0030994e855028258201c42894fabc95cc5857f5e0cb2802f6202c7f079dab3edf045a012713b963b8e01825820af4805d4ff46a282ae22ae4800c66cebb3577a5641db3f519b14bf65a2bf706801825820ef10895f1cec9fe0e989dadb171593f6b470b488c84ee0cf85aa3315b699d44e010dd9010281825820af4805d4ff46a282ae22ae4800c66cebb3577a5641db3f519b14bf65a2bf70680112d90102818258205237b67923bf67e6691a09117c45fdc26c27911a8e2469d6a063a78da1c7c60a000182a300581d7061458bc2f297fff3cc5df6ac7ab57cefd87763b0b7bd722146a1035c01821a01ce3c08a1581c1d2b05ba3174d9cc82fa7dfb0e49c09077840138aefc349a451006b6a1581ca3f7fc2c91e3933473a9f3849f7cee16fdad6a6d3617d4026582644001028201d81859016ed8799f5820fd9c74e316f8b24dd3d16b057889542045d9bb7764d37aa67312058d6e6f28d39fd8799fd8799f58201c42894fabc95cc5857f5e0cb2802f6202c7f079dab3edf045a012713b963b8e01ff5f5840d8799fd8799fd8799f581c326cd6bff6114c4d14ebf2385883aac43c4e64476e6a47314f9b2003ffd8799fd8799fd8799f581c62490151e1e619c114e2f11fef5823451fdc30e752378e1641ce9045a939ffffffffa140a1401a00895440d87980d87a80ffffffd8799fd8799f5820ef10895f1cec9fe0e989dadb171593f6b470b488c84ee0cf85aa3315b699d44e01ff5f5840d8799fd8799fd8799f581c326cd6bff6114c4d14ebf2385883aac43c4e64476e6a47314f9b2003ffd8799fd8799fd8799f581c62490151e1e619c114e2f11fef5823451fdc30e752378e1641ce9045a939ffffffffa140a1401a01312d00d87980d87a80ffffffff581c1d2b05ba3174d9cc82fa7dfb0e49c09077840138aefc349a451006b6ff82581d60a3f7fc2c91e3933473a9f3849f7cee16fdad6a6d3617d402658264401a0561468c021a001b3f050ed9010281581ca3f7fc2c91e3933473a9f3849f7cee16fdad6a6d3617d402658264400b58206c1f8b1e61c9b08eb106d5f7fe38dab9e1fb4766738d91f65fe2100d7bfa3e7f07582012e5af821e4510d6651e57185b4dae19e8bd72bf90a8c1e6cd053606cbc46514a200d9010281825820e6f630d2cc525adda7d82f6f61b0008413c18d73fc394ca63300c3231a34edeb58401e677c158701eeb67548660f52b3a9c949d9fc00e899c3f9998b491174cc802b755c2bd8c3f7f307ee0893b2b367c5273305e2a566ddc6745571887b92d7320c05a182000082d87a9f9fd8799f58201c42894fabc95cc5857f5e0cb2802f6202c7f079dab3edf045a012713b963b8e01ffd8799f5820ef10895f1cec9fe0e989dadb171593f6b470b488c84ee0cf85aa3315b699d44e01ffffff821a00d59f801b00000002540be400f5d90103a100a119d90370487964726156312f436f6d6d69745478',
      true,
      0,
      0
    )
    console.log(signedCborHex)
    // const rs = await hydraBridge.value.submitCardanoTransaction({
    //   ...unsignedTx,
    //   cborHex: signedCborHex
    // })
    // console.log('>>> / rs:', rs)
    // if (rs) {
    //   message.success('TransactionSubmitted')
    // }
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
      txHashes: [
        '760cc1a7dfe8d7fc81e019a03f37c8ca2938ab55aafd8c88617f2a72947b55d2#1',
        '760cc1a7dfe8d7fc81e019a03f37c8ca2938ab55aafd8c88617f2a72947b55d2#0'
      ],
      lovelace: '7000000',
      toAddress:
        'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0',
      inlineDatum: {},
      secret: {
        privateKey: privateSigningKey
      }
    })
    console.log('txCbor2', cborHex)
    hydraBridge.value?.commands.newTx(cborHex)
  }

  const closeHead = () => {
    const bridge = getBridge()
    bridge.commands.close()
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
      <!-- <div class="max-h-80 overflow-auto">
        <highlightjs language="js" class="text-10px w-full" :code="JSON.stringify(hydraUTxO, null, 2)" />
      </div> -->
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
  </div>
</template>

<style lang="scss" scoped></style>
