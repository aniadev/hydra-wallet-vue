<script setup lang="ts">
  import { formatId, toFixedNumber, recursiveToCamel, formatNumber, hexToUtf8 } from '@/utils/format'
  import { useDateFormat } from '@vueuse/core'
  import BaseSkeleton from '@/components/base/Skeleton.vue'
  import { useCopy } from '@/utils/useCopy'
  import { message } from 'ant-design-vue'
  import type { WalletCore } from '@/interface/wallet.type'
  import getRepository, { RepoName } from '@/repositories'
  import { WalletRepository } from '@/repositories/wallet'
  import { TxsRepository } from '@/repositories/transaction'
  import type { Transaction } from '@/interface/transaction.type'
  import { WalletAsset } from '../interfaces'

  import IconTxsIncoming from '~icons/svg/txs-incoming.svg'
  import IconTxsOutgoing from '~icons/svg/txs-outgoing.svg'
  import { storeToRefs } from 'pinia'

  const walletApi = getRepository(RepoName.Wallet) as WalletRepository
  const txsApi = getRepository(RepoName.Transaction) as TxsRepository
  const { currentWalletAddress, setCurrentWalletAddress, setCurrentWallet } = useAuthV2()
  const walletCore = useWalletCore()
  const isLoading = ref(false)

  const isLoadingNetworkInfo = ref(false)
  const nodeState = ref<WalletCore.SyncProgress>({
    status: 'ready',
    progress: {
      quantity: 0,
      unit: 'percent'
    }
  })

  const isShowQrCode = ref(false)

  const auth = useAuthV2()
  const { walletNFTs, walletTokens, currentWallet } = storeToRefs(auth)

  const txsHistory = ref<Array<Transaction>>([])
  const txsHistoryParams = ref({
    maxCount: 10,
    start: ''
  })
  const isLoadingHistory = ref(false)
  const canLoadmoreHistory = ref(true)

  async function init() {
    isLoading.value = true
    if (!currentWallet.value) {
      // handled by router
      return
    }
    const rs = await walletApi.getWalletById(currentWallet.value.id)
    console.log('>>> / file: Home.vue:59 / rs:', rs)

    const walletDetail = recursiveToCamel<WalletCore.WalletAccount>(rs)
    if (!walletDetail) {
      // handled by router
      message.error('Wallet not found')
      return
    }
    setCurrentWallet(walletDetail)
    isLoading.value = false
  }

  async function getListTransaction() {
    if (!currentWallet.value) {
      return
    }
    try {
      isLoadingHistory.value = true
      const rs = await txsApi.getListTransaction(currentWallet.value.id, {
        ...txsHistoryParams.value
      })
      txsHistory.value = rs.map(item => recursiveToCamel<Transaction>(item))
      canLoadmoreHistory.value = rs.length === txsHistoryParams.value.maxCount
    } catch (e) {
      console.log('getListTransaction', e)
    } finally {
      isLoadingHistory.value = false
    }
  }

  async function getListAssets() {
    if (!currentWallet.value || !currentWalletAddress || !auth.rootKey) {
      if (!currentWallet.value) console.warn('currentWallet is not found')
      if (!currentWalletAddress) console.warn('currentWalletAddress is not found')
      if (!auth.rootKey) console.warn('auth.rootKey is not found')
      return
    }
    try {
      isLoadingHistory.value = true
      console.log('>>> / file: Home.vue:94 / auth.rootKey:', auth.rootKey)
      const stakeAddress = walletCore.getStakeAddressByRootkey(auth.rootKey)
      const [tokens, nfts] = await Promise.all([
        walletApi.getWalletTokens(stakeAddress),
        walletApi.getWalletNfts(stakeAddress)
      ])
      if (tokens && tokens.length) {
        walletTokens.value = tokens.map(
          item =>
            new WalletAsset({
              assetName: item.assetName,
              policyId: item.policy,
              fingerprint: item.fingerprint,
              quantity: item.quantity,
              metadata: item.metadata
            })
        )
      } else {
        walletTokens.value = []
      }

      if (nfts && nfts.length) {
        walletNFTs.value = nfts.map(
          item =>
            new WalletAsset({
              assetName: item.assetName,
              policyId: item.policy,
              fingerprint: item.fingerprint,
              quantity: item.quantity,
              metadata: item.metadata
            })
        )
      } else {
        walletNFTs.value = []
      }
    } catch (e) {
      console.log('getListTransaction', e)
    } finally {
      isLoadingHistory.value = false
    }
  }

  function loadmoreHistory() {
    if (isLoadingHistory.value || !canLoadmoreHistory.value) {
      return
    }
    txsHistoryParams.value.maxCount += 10
    getListTransaction()
  }

  const { pause, resume, isActive } = useIntervalFn(() => {
    init()
    getListTransaction()
    getListAssets()
  }, 30000)

  // const router = useRouter()
  // const hydraApi = getRepository(RepoName.Hydra) as HydraRepository
  // async function onClickHydraTransfer() {
  //   // router.push({ name: 'HydraFastTransfer' })
  //   const fetchAvailableHydraHead = useDebounceFn(async () => {
  //     if (!currentWallet.value) {
  //       return
  //     }
  //     try {
  //       const rs = await hydraApi.fetchHydraAvailable(currentWallet.value.id)
  //       console.log('>>> / file: Home.vue:159 / rs:', rs)
  //       if (rs && rs.ws) {
  //         router.push({ name: 'HydraFastTransfer', query: { node_src: rs.ws } })
  //       }
  //     } catch (err) {
  //       console.log('>>> / file: Home.vue:161 / err:', err)
  //     }
  //   }, 300)()

  //   fetchAvailableHydraHead.then(rs => {
  //     console.log('>>> / file: Home.vue:160 / rs:', rs)
  //   })
  // }

  onMounted(async () => {
    await init()
    getListTransaction()
    getListAssets()
    resume()
  })

  onBeforeUnmount(() => {
    pause()
  })
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between bg-[#fff]" v-if="currentWallet && currentWalletAddress">
    <div class="op-40 fixed bottom-1 right-1" hover="cursor-pointer op-100">
      <div class="py-2px flex items-center rounded-full bg-green-500 px-2">
        <span class="bg-warning-300 mr-1 h-2 w-2 rounded-full"></span>
        <span class="text-xs-medium text-gray-100">pre-prod</span>
      </div>
    </div>
    <div class="h-[56px] flex-shrink-0 bg-[#fff]">
      <div class="flex h-full items-center justify-between px-4" border="b b-solid b-gray-3">
        <img src="/images/wallet-logo.png" alt="logo" class="w-36px h-36px object-contain" />
        <!-- <div class="text-xs">{{ nodeState.status === 'ready' ? 'Synced' : nodeState?.progress?.quantity || 100 + '%' }}</div> -->
        <div class="flex items-center">
          <div
            class="mr-2 flex rounded-full p-1 transition-all last:mr-0"
            hover="cursor-pointer bg-[#EBDEDC]"
            @click="isShowQrCode = true"
          >
            <icon icon="ic:outline-qr-code" height="20" />
          </div>
          <div
            class="mr-2 flex rounded-full p-1 transition-all last:mr-0"
            hover="cursor-pointer bg-[#EBDEDC]"
            @click="$router.push({ name: 'Settings' })"
          >
            <icon icon="ic:outline-settings" height="20" />
          </div>
        </div>
      </div>
    </div>
    <div class="flex-grow-1 mt-4 flex flex-col overflow-y-hidden px-4">
      <div class="bg-[#fff] pb-1">
        <div class="text-body-1 font-500 flex items-center justify-center text-center">
          {{ formatId(currentWalletAddress.address, 12, 12) }}
          <icon
            icon="tabler:copy"
            height="24"
            class="ml-2 hover:cursor-pointer"
            @click="useCopy(currentWalletAddress.address)"
          />
        </div>
        <div class="mt-6">
          <div class="rounded-4 bg-white p-4" border="1 solid #c7bab8">
            <p class="text-body-2 font-500 mb-0">
              Total Balance
              <span class="text-xs-medium text-green-700" v-if="currentWallet.state.status === 'syncing'">
                (Syncing {{ currentWallet.state.progress.quantity }}%)
              </span>
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <p class="text-title-2 font-700 mb-0">
                  ₳ {{ (currentWallet.balance.total.quantity / 1e6).toFixed(2) }}
                </p>
                <loading :size="18" class="ml-2" v-if="isLoading" />
              </div>
              <icon icon="tabler:eye" height="20" />
            </div>
            <div class="mt-4 flex">
              <a-button
                type="default"
                class="btn-primary btn-shadow-primary !h-10 !w-1/3 text-white"
                @click="$router.push({ name: 'Transfer' })"
                >Send</a-button
              >
              <a-button
                type="default"
                class="btn-tertiary ml-4 !w-2/3 shadow-[3px_4px_0px_0_#000]"
                @click="$router.push({ name: 'HydraFastTransfer' })"
              >
                Hydra Transfer</a-button
              >
            </div>
          </div>
          <!-- <base-skeleton type="text" :height="16" :loading="true" /> -->
        </div>
      </div>
      <div class="flex-grow-1 mt-2 overflow-hidden">
        <a-tabs value="History" class="wallet-detail-tabs">
          <a-tab-pane key="1" tab="Tokens">
            <div class="">
              <div
                class="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-4 transition-all"
                border="1 solid #c7bab8"
                hover="cursor-pointer bg-[#c7bab8] bg-opacity-10"
                v-for="(item, index) in walletTokens"
                :key="item.policyId"
              >
                <div class="flex w-full items-center">
                  <div
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white"
                    border="1 solid #c7bab8"
                  >
                    <image-loader :imageHash="item.imageHash" class="h-full w-full rounded-full object-contain" />
                  </div>
                  <div class="flex-grow-1 ml-4 flex items-center justify-between">
                    <span class="text-body-1 font-700">{{ item.assetName }}</span>
                    <span class="text-body-1 font-500 text-primary">
                      {{ formatNumber(item.quantity || 0) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="" v-if="walletTokens.length == 0">
                <p class="font-600 text-center text-sm">No tokens</p>
              </div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="2" tab="NFTs">
            <div class="">
              <div
                class="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-4 transition-all"
                border="1 solid #c7bab8"
                hover="cursor-pointer bg-[#c7bab8] bg-opacity-10"
                v-for="(item, index) in walletNFTs"
                :key="index"
              >
                <div class="flex w-full items-center">
                  <div
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white"
                    border="1 solid #c7bab8"
                  >
                    <image-loader :imageHash="item.imageHash" class="h-full w-full rounded-full object-contain" />
                  </div>
                  <div class="flex-grow-1 ml-4 flex items-center justify-between">
                    <span class="text-body-1 font-700">{{ item.assetName }}</span>
                    <span class="text-body-1 font-500 text-primary">
                      {{ formatNumber(item.quantity || 0) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="" v-if="walletNFTs.length == 0">
                <p class="font-600 text-center text-sm">No NFTs</p>
              </div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="3" tab="History">
            <div class="txs-history-wrapper">
              <a-collapse ghost :expandIconPosition="'end'">
                <template #expandIcon="data">
                  <icon
                    icon="tabler:chevron-right"
                    height="20"
                    class="transition-all"
                    :class="[data?.isActive ? 'rotate-90' : 'rotate-0']"
                  />
                </template>
                <a-collapse-panel
                  class="txs-history-item"
                  v-for="(item, index) in txsHistory"
                  :key="item.id"
                  :class="[item.direction === 'outgoing' ? 'bg-[#FFF4F3]' : 'bg-[#F3FFF6]']"
                >
                  <template #header="data">
                    <div class="flex w-full items-center justify-between">
                      <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white">
                        <IconTxsIncoming v-if="item.direction === 'incoming'" size="5" />
                        <IconTxsOutgoing v-else size="5" />
                      </div>
                      <div class="flex-grow-1 mx-2 flex items-center justify-between">
                        <div class="">
                          <div class="">
                            <span class="font-500 text-sm">
                              {{ formatId(item.id, 6, 8) }}
                              <icon
                                icon="tabler:copy"
                                height="14"
                                class="-mb-2px ml-2px inline hover:cursor-pointer"
                                @click="useCopy(item.id)"
                              />
                            </span>
                          </div>
                          <p class="font-400 text-gray-4 !mb-0 text-xs">
                            {{
                              item.insertedAt
                                ? useDateFormat(item.insertedAt.time, 'DD/MM/YYYY, hh:mm A').value
                                : 'Pending'
                            }}
                          </p>
                        </div>
                        <div class="">
                          <span
                            class="font-600 text-xs"
                            :class="[item.direction === 'incoming' ? 'text-[#16BD4F]' : 'text-[#D63C37]']"
                          >
                            {{ item.direction === 'incoming' ? '+' : '-'
                            }}{{ toFixedNumber(item.amount.quantity / 1e6, 6) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <div class="">
                    <div class="flex justify-between">
                      <div class="">
                        <span class="font-600 block text-xs">{{ item.outputs.length }} UTxO Output(s)</span>
                        <div class="mt-1">
                          <div
                            class="bg-gray-2 rounded-1 mb-1 px-2 py-1 last:mb-0"
                            v-for="output in item.outputs"
                            :key="output.address"
                          >
                            <p class="font-600 mb-1 text-xs">
                              {{ formatId(output.address, 12, 10) }}
                              <icon
                                icon="tabler:copy"
                                height="14"
                                class="-mb-2px ml-2px inline hover:cursor-pointer"
                                @click="useCopy(output.address)"
                              />
                            </p>
                            <p class="font-500 mb-0 text-right text-xs">
                              {{ toFixedNumber(output.amount.quantity / 1e6, 2) }}₳
                            </p>
                          </div>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="font-600 block text-xs">Fee</span>
                        <span class="font-600 block text-xs text-[#D63C37]">{{
                          toFixedNumber(item.fee.quantity / 1e6, 6)
                        }}</span>
                      </div>
                    </div>
                    <div class="mt-2" v-if="!item.scriptIntegrity">
                      <span class="font-600 block text-xs">Assets ({{ item.outputs[0]?.assets?.length || 0 }})</span>
                      <div class="mt-1" v-if="item.outputs[0]?.assets">
                        <div
                          class="bg-gray-2 rounded-1 mb-1 px-2 py-1 last:mb-0"
                          v-for="(asset, i) in item.outputs[0].assets"
                          :key="i"
                        >
                          <p class="font-600 mb-1 text-xs">Asset name: {{ hexToUtf8(asset.assetName) }}</p>
                          <p class="font-500 mb-0 text-xs">Quantity: {{ toFixedNumber(asset.quantity, 0) }}</p>
                          <p class="font-500 mb-0 text-xs">Policy ID: {{ formatId(asset.policyId, 12, 10) }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-collapse-panel>
              </a-collapse>
              <div class="flex justify-center py-2">
                <a-button
                  v-if="canLoadmoreHistory"
                  type="default"
                  class="btn-shadow-primary !rounded-3 !bg-primary border-primary text-white"
                  @click="loadmoreHistory()"
                  :loading="isLoadingHistory"
                >
                  More
                </a-button>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
    <a-drawer
      v-model:open="isShowQrCode"
      class="rounded-t-3 !bg-[#fff]"
      root-class-name="root-class-name"
      placement="bottom"
      :closable="false"
      :height="300"
    >
      <div class="flex justify-center">
        <!-- <div class="rounded-2 p-1" border="1 solid #c7bab8">
          <img src="/images/examples/qrcode.jpg" alt="" class="h-40 w-40 rounded object-contain" />
        </div> -->
        <a-qrcode error-level="H" :value="currentWalletAddress.address" icon="/logo-100x100.svg" />
      </div>
      <div class="mt-8 flex items-center">
        <div class="flex-grow text-left">
          <span class="text-body-1 font-400 text-gray-6">HYDRA address</span>
          <div class="text-body-1 text-gray-8 mt-1">
            {{ formatId(currentWalletAddress.address, 10, 7) }}
            <!-- <span>
              <icon icon="ic:outline-copy-all" height="18" class="ml-2 hover:cursor-pointer" @click="useCopyContent('0x2F1Fe5a0BE48e1f7Ec0BC8beA6045985a0210C96')" />
            </span> -->
          </div>
        </div>
        <div class="flex-shrink-0">
          <a-button
            type="default"
            class="!rounded-3 !bg-primary btn-shadow-primary border-primary flex !h-10 !w-full items-center text-white"
            @click="useCopy(currentWalletAddress.address)"
          >
            <icon icon="tabler:copy" height="18" class="mr-1" /> Copy
          </a-button>
        </div>
      </div>
    </a-drawer>
  </div>
  <div class="" v-else>
    <base-skeleton type="text" :height="16" :loading="true" />
  </div>
</template>

<style scoped lang="scss">
  .txs-history-wrapper {
    .txs-history-item {
      @apply mb-2 rounded-2xl px-4 py-3 transition-all last:mb-0;

      :deep(.ant-collapse-header) {
        @apply items-center p-0;
      }
    }
  }

  .wallet-detail-tabs {
    @apply flex h-full flex-col;
    :deep(.ant-tabs-nav) {
      @apply mb-0;
    }
    :deep(.ant-tabs-content-holder) {
      @apply flex-grow overflow-auto pt-2;
    }
  }
</style>
