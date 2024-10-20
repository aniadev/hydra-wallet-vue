<script lang="ts" setup>
// Utils
import {
  formatId,
  toFixedNumber,
  recursiveToCamel,
  convertKeysToSnakeCase,
  convertAmountDecimal,
} from '@/utils/format'
import { useCopy } from '@/utils/useCopy'
import { EventBusListener, useDateFormat } from '@vueuse/core'

// components
import IconTxsIncoming from '~icons/svg/txs-incoming.svg'
import IconTxsOutgoing from '~icons/svg/txs-outgoing.svg'
import BaseLoading from '@/components/base/Loading.vue'

//   Repositories
import getRepository, { RepoName } from '@/repositories'
import { HydraRepository } from '@/repositories/hydra'
import { UtxoObject } from '../interfaces'
import { TxsRepository } from '@/repositories/transaction'
import { message } from 'ant-design-vue'
const hydraApi = getRepository(RepoName.Hydra) as HydraRepository

const txsApi = getRepository(RepoName.Transaction) as TxsRepository

//   Composables
const walletCore = useWalletCore()
const hydraCore = useHydraCore()

//   Props
const props = defineProps<{
  wallet: {
    id: string
  }
  sessionData: {
    receiverAddr: string
    utxo: UtxoObject
    mnemonic: string
    senderAddr: string
    derivationPath: string[]
  }
}>()

const emits = defineEmits<{
  onFinished: []
}>()

const firstUxto = computed(() => ({
  txId: Object.keys(props.sessionData.utxo)[0],
  data: props.sessionData.utxo[Object.keys(props.sessionData.utxo)[0]],
}))

const snapshotUtxo = ref<UtxoObject>()
const snapshotAmount = ref(firstUxto.value.data.value.lovelace)

const formData = reactive({
  amount: '',
  address: '',
})

type HistoryItem = {
  id: string
  amount: number
  insertedAt: {
    time: number
  }
  direction: 'incoming' | 'outgoing'
  outputs: Array<{
    address: string
    amount: {
      quantity: number
    }
  }>
}
const historyItems = ref<HistoryItem[]>([])

hydraCore.events.on((event, payload) => {
  console.log('>>> / file: TransferScreen.vue:154 / event:', event, payload)

  if (event === hydraCore.EVENT_NAME.HYDRA_STATE) {
    console.log('>>> / file: TransferScreen.vue:153 / payload:', payload)
  }
})

const refScrollContainer = ref<HTMLDivElement>()
const isSendingTxs = ref(false)
async function onClickSend() {
  console.log('onClickSend')
  isSendingTxs.value = true
  hydraApi
    .construct({
      amount: Number.parseFloat(formData.amount) * 1e6,
      sender: firstUxto.value.data.address,
      receiver: props.sessionData.receiverAddr,
      derivationPath: props.sessionData.derivationPath,
      mnemonic: props.sessionData.mnemonic,
    })
    .then(signedTxCborHex => {
      console.log(
        '>>> / file: TransferScreen.vue:78 / signedTxCborHex:',
        signedTxCborHex,
      )
      return hydraApi.transfer({ cborHex: signedTxCborHex })
    })
    .then(transferRs => {
      if (
        !transferRs.valid ||
        !transferRs.txId ||
        transferRs.message?.toLowerCase().includes('error')
      ) {
        throw new Error('Failed to send transaction')
      }
      historyItems.value.push({
        id: transferRs.txId,
        amount: Number.parseFloat(formData.amount) * 1e6,
        insertedAt: {
          time: Date.now(),
        },
        direction: 'outgoing',
        outputs: [
          {
            address: props.sessionData.receiverAddr,
            amount: {
              quantity: Number.parseFloat(formData.amount) * 1e6,
            },
          },
        ],
      })
      snapshotAmount.value -= Number.parseFloat(formData.amount) * 1e6

      return hydraApi.snapshotUtxo({})
    })
    .then(snapshotUtxoRs => {
      console.log(
        '>>> / file: TransferScreen.vue:100 / snapshotUtxoRs:',
        snapshotUtxoRs,
      )
      snapshotUtxo.value = snapshotUtxoRs
    })
    .catch(error => {
      console.log('>>> / file: TransferScreen.vue:66 / error:', error)
      message.error(error.message)
    })
    .finally(() => {
      isSendingTxs.value = false
      nextTick(() => {
        refScrollContainer.value?.scrollTo({
          top: refScrollContainer.value.scrollHeight + 10000,
          behavior: 'smooth',
        })
      })
    })
}

// Modal confirm finish
const isShowModalConfirmFinish = ref(false)
const isClosing = ref(false)
function onClickFinish() {
  isClosing.value = true
  isShowModalConfirmFinish.value = false
  hydraCore.sendCommand('Close')
  openModalResult()
  // hydraApi
  //   .close()
  //   .then(rs => {
  //     console.log('>>> / file: TransferScreen.vue:134 / rs:', rs)
  //   })
  //   .catch(error => {
  //     console.log('>>> / file: TransferScreen.vue:138 / error:', error)
  //   })
  //   .finally(() => {
  //     isClosing.value = false
  //     openModalResult()
  //   })
}

// Modal result
const isShowModalResult = ref(false)
const result = ref({
  utxo: {} as UtxoObject,
})
const loadingResult = ref(false)
const eventListenerModalResult: EventBusListener<any, any> = (
  event: HeadTag,
  payload: any,
) => {
  console.log(
    '>>> / file: TransferScreen.vue / eventListenerModalResult:',
    event,
    payload,
  )
  if (event === HeadTag.HeadIsFinalized) {
    loadingResult.value = false
    result.value.utxo = payload?.utxo || {}
  }
}
function openModalResult() {
  isShowModalResult.value = true
  loadingResult.value = true
  hydraCore.tagEvents.on(eventListenerModalResult)
}
function onCloseModalResult() {
  loadingResult.value = false
  hydraCore.tagEvents.off(eventListenerModalResult)
  emits('onFinished')
  console.log('>>> / file: TransferScreen.vue:161 / onCloseModalResult')
}

const parseListUTxO = (utxo: UtxoObject) => {
  return Object.keys(utxo).map(key => ({
    txId: key,
    data: utxo[key],
  }))
}

onMounted(() => {})
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <div class="mb-2 flex items-center justify-between">
      <div class="">
        {{ convertAmountDecimal(snapshotAmount / 1e6, 'ADA') }} ₳
      </div>
      <a-button
        type="default"
        class="!rounded-3 !bg-primary btn-shadow-primary border-primary !w-30 !h-10 text-white"
        @click="() => (isShowModalConfirmFinish = true)"
      >
        Finish
      </a-button>
    </div>
    <div
      class="scroll-bar-primary mt-2 flex-grow overflow-y-auto pr-1"
      border="t t-solid t-gray-2"
      ref="refScrollContainer"
    >
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
            v-for="(item, index) in historyItems"
            :key="index"
            :class="[
              'outgoing' === 'outgoing' ? 'bg-[#FFF4F3]' : 'bg-[#F3FFF6]',
            ]"
          >
            <template #header="data">
              <div class="flex w-full items-center justify-between">
                <div
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white"
                >
                  <IconTxsIncoming v-if="'incoming' !== 'incoming'" size="5" />
                  <IconTxsOutgoing v-else size="5" />
                </div>
                <div class="flex-grow-1 mx-2 flex items-center justify-between">
                  <div class="">
                    <div class="">
                      <span class="font-500 text-sm">
                        {{ formatId(item.id, 6, 9) }}
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
                          ? useDateFormat(
                              item.insertedAt.time,
                              'DD/MM/YYYY, hh:mm A',
                            ).value
                          : 'Pending'
                      }}
                    </p>
                  </div>
                  <div class="">
                    <span
                      class="font-600 text-xs"
                      :class="[
                        item.direction === 'incoming'
                          ? 'text-[#16BD4F]'
                          : 'text-[#D63C37]',
                      ]"
                    >
                      {{ item.direction === 'incoming' ? '+' : '-'
                      }}{{ toFixedNumber(item.amount / 1e6, 6) }} ₳
                    </span>
                  </div>
                </div>
              </div>
            </template>
            <div class="">
              <div class="flex justify-between">
                <div class="">
                  <span class="font-600 block text-xs"
                    >{{ item.outputs?.length }} UTxO Output(s)</span
                  >
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
                    toFixedNumber(0 / 1e6, 6)
                  }}</span>
                </div>
              </div>
              <div class="mt-2">Assets</div>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
    <div class="mt-4 flex pt-4" border="t t-solid t-gray-2">
      <div class="mr-4 flex-grow">
        <a-input
          v-model:value="formData.amount"
          addon-before="Amount"
          size="large"
          class="!rounded-3 !bg-gray-1 border-gray-3 !w-full"
          placeholder="Enter amount"
        />
      </div>
      <a-button
        type="default"
        :disabled="
          !formData.amount ||
          !snapshotAmount ||
          +formData.amount * 1e6 > snapshotAmount
        "
        :loading="isSendingTxs"
        class="!rounded-3 !bg-primary border-primary !h-10 !w-20 text-white"
        @click="onClickSend()"
      >
        Send
      </a-button>
    </div>

    <a-modal
      v-model:open="isShowModalConfirmFinish"
      title="Confirm"
      centered
      @ok="onClickFinish"
      :confirmLoading="isClosing"
    >
      <p>Finish transaction and leave</p>
    </a-modal>
    <a-modal
      v-model:open="isShowModalResult"
      title="Result"
      centered
      :after-close="onCloseModalResult"
      :closable="false"
    >
      <div v-if="loadingResult" class="flex h-20 w-full justify-center">
        <base-loading :size="28" />
      </div>
      <div class="" v-else>
        <div class="flex items-center justify-between">
          <div class="font-600 text-xs">UTxO</div>
          <div class="font-600 text-xs">Amount</div>
        </div>
        <div class="max-h-260px mt-2 overflow-y-auto">
          <div
            class="bg-gray-2 rounded-1 mb-1 px-2 py-1 last:mb-0"
            v-for="utxo in parseListUTxO(result.utxo)"
            :key="utxo.txId"
          >
            <p class="font-600 mb-1 text-xs">
              {{ formatId(utxo.txId, 12, 10) }}
              <icon
                icon="tabler:copy"
                height="14"
                class="-mb-2px ml-2px inline hover:cursor-pointer"
                @click="useCopy(utxo.txId)"
              />
            </p>
            <div class="flex items-center justify-between">
              <span class="font-500 mr-2 text-xs">{{
                formatId(utxo.data.address, 9, 10)
              }}</span>
              <span class="font-500 mb-0 text-right text-xs">
                {{ toFixedNumber(utxo.data.value.lovelace / 1e6, 6) }}₳
              </span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <a-button
          type="default"
          :disabled="loadingResult"
          @click="isShowModalResult = false"
          class="!rounded-3 !bg-primary border-primary !h-10 !w-full text-white"
        >
          Finish
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<style lang="scss" scoped>
.txs-history-wrapper {
  .txs-history-item {
    @apply mb-2  rounded-2xl px-4 py-3 transition-all first:mt-2 last:mb-0;

    :deep(.ant-collapse-header) {
      @apply items-center p-0;
    }
  }
}
</style>
