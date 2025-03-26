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
  import { buildEnterpriseAddress } from '@/lib/utils/builder'
  import { Hash28ByteBase16 } from '@cardano-sdk/crypto'

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
    const enterpriseAddress = buildEnterpriseAddress(
      1,
      Hash28ByteBase16.fromEd25519KeyHashHex(wallet.getAccount().paymentKey.toPublic().hash().hex())
    ).toAddress()

    address.value = wallet.getEnterpriseAddress()
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
