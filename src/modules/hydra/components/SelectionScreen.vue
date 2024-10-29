<script lang="ts" setup>
  import BaseLoading from '@/components/base/Loading.vue'

  import getRepository, { RepoName } from '@/repositories'
  import { HydraRepository } from '@/repositories/hydra'
  import { WalletRepository } from '@/repositories/wallet'
  import { formatId, convertAmountDecimal } from '@/utils/format'
  import { HydraState, type UtxoObject } from '../interfaces'
  import { message } from 'ant-design-vue'

  type WalletAddress = {
    id: string
    derivationPath: string[]
    state: 'used' | 'unused'
    utxos?: {
      txhash: string
      blockhash: string
      address: string
      txindex: number
      value: number
    }[]
  }

  const hydraApi = getRepository(RepoName.Hydra) as HydraRepository
  const walletApi = getRepository(RepoName.Wallet) as WalletRepository

  const emits = defineEmits<{
    PrepareSuccess: [initialUtxo: UtxoObject]
  }>()

  const auth = useAuthV2()
  const walletId = computed(() => auth.currentWallet?.id || '')
  const hydraCore = useHydraCore()

  const steps = ref([
    {
      title: 'Select address',
      key: 'SELECT_ADDRESS',
      component: 'SelectAddress'
    },
    {
      title: 'Select UTxO',
      key: 'SELECT_UTXO',
      component: 'SelectAsset'
    },
    {
      title: 'Receiver',
      key: 'ENTER_RECEIVER',
      component: ''
    },
    {
      title: 'Security',
      key: 'ENTER_PASSPHRASE',
      component: ''
    },
    {
      title: 'Init Hydra',
      key: 'INIT_HYDRA',
      component: ''
    }
  ])
  enum Step {
    SELECT_ADDRESS = 0,
    SELECT_UTXO = 1,
    ENTER_RECEIVER = 2,
    ENTER_PASSPHRASE = 3,
    INIT_HYDRA = 4
  }
  const current = ref<Step>(Step.SELECT_ADDRESS)
  const items = computed(() => {
    return steps.value.map((step, index) => {
      return {
        title: step.title,
        key: step.key,
        description: getDesc(step.key),
        disabled: getDisabled(step.key)
        // status: index === current.value ? 'process' : index < current.value ? 'finish' : 'wait'
      }
    })
  })

  const listAddress = ref<WalletAddress[]>([])

  const UTxOs = ref<UtxoObject>({})

  const listUTxOs = computed(() => {
    return Object.entries(UTxOs.value).map(([key, value]) => {
      return {
        txId: key,
        ...value
      }
    })
  })

  const preparingData = ref({
    address: '',
    utxo: '',
    amount: '',
    passphrase: '',
    mnemonic: '',
    receiverAddrr: ''
  })

  // TODO: Secure storage by another way
  const sessionData = useSessionStorage('hydra-demo', {
    receiverAddr: '',
    utxo: {} as UtxoObject,
    mnemonic: '',
    senderAddr: '',
    derivationPath: [] as string[]
  })

  const getDesc = (key: string) => {
    if (key === 'SELECT_ADDRESS') {
      return formatId(preparingData.value.address, 12, 16)
    } else if (key === 'SELECT_UTXO') {
      return (
        formatId(preparingData.value.utxo, 12, 16) +
        ` (${convertAmountDecimal(+preparingData.value.amount / 1e6, 'ADA')} ₳)`
      )
    } else if (key === 'ENTER_RECEIVER') {
      return formatId(preparingData.value.receiverAddrr, 12, 16)
    } else if (key === 'ENTER_PASSPHRASE') {
      return 'Secure your transaction'
    }
    return ''
  }

  const getDisabled = (key: string) => {
    if (key === 'SELECT_ADDRESS') {
      return !preparingData.value.address
    } else if (key === 'SELECT_UTXO') {
      return !preparingData.value.utxo || !preparingData.value.address
    } else if (key === 'ENTER_RECEIVER') {
      return !preparingData.value.utxo || !preparingData.value.address || !preparingData.value.receiverAddrr
    } else if (key === 'ENTER_PASSPHRASE') {
      return (
        !preparingData.value.utxo ||
        !preparingData.value.address ||
        !preparingData.value.receiverAddrr ||
        !preparingData.value.mnemonic
      )
    } else if (key === 'INIT_HYDRA') {
      return true
    }
    return false
  }

  const onClickContinue = () => {
    if (steps.value[current.value].key === 'SELECT_ADDRESS') {
      current.value = Step.SELECT_UTXO
      getUtxoOfAddress(preparingData.value.address)
    } else if (steps.value[current.value].key === 'SELECT_UTXO') {
      current.value = Step.ENTER_RECEIVER
    } else if (steps.value[current.value].key === 'ENTER_RECEIVER') {
      current.value = Step.ENTER_PASSPHRASE
    } else if (steps.value[current.value].key === 'ENTER_PASSPHRASE') {
      // TODO: call api to send transaction
      current.value = Step.INIT_HYDRA
      startFastTransfer()
    }
  }

  watch(current, (val, oldVal) => {
    if (oldVal > val) {
      if (val === 0) {
        getWalletAddresses()
        preparingData.value.address = ''
        preparingData.value.utxo = ''
        preparingData.value.amount = ''
      }
    }
  })

  const isLoadingUxto = ref(false)
  async function getUtxoOfAddress(address: string) {
    try {
      isLoadingUxto.value = true
      UTxOs.value = {}
      const rs = await hydraApi.getListUtxo({ address })
      rs.forEach(item => {
        UTxOs.value[`${item.txhash}#${item.txindex}`] = {
          address: item.address,
          datum: null,
          datumhash: null,
          inlineDatum: null,
          referenceScript: null,
          value: {
            lovelace: item.value
          }
        }
      })
    } catch (error) {
      console.error('getUtxoOfAddress', error)
    } finally {
      isLoadingUxto.value = false
    }
  }

  async function getWalletAddresses() {
    try {
      listAddress.value = []
      const rs = await walletApi.getWalletAddresses(walletId.value, { state: 'used' })
      listAddress.value = rs.filter(item => item.state === 'used')

      if (listAddress.value.length) {
        const utxoFetchs = listAddress.value.map(item => hydraApi.getListUtxo({ address: item.id }))
        const addrUtxo = await Promise.all(utxoFetchs)
        addrUtxo.forEach((utxos, index) => {
          listAddress.value[index].utxos = utxos
        })
      }
    } catch (error) {
      console.error('getWalletAddresses', error)
    }
  }

  const hasPolicyId = (value: any) => {
    return typeof value === 'object' && Object.keys(value).length > 1
  }

  const onSelectUtxo = () => {
    preparingData.value.amount = `${UTxOs.value[preparingData.value.utxo]?.value.lovelace || 0}`
  }

  onMounted(async () => {
    getWalletAddresses()
  })

  const progress = ref(10)
  const progressMessage = ref('Seting up Hydra')
  async function startFastTransfer() {
    try {
      const initialUtxo = {
        [preparingData.value.utxo]: UTxOs.value[preparingData.value.utxo]
      }
      sessionData.value = {
        receiverAddr: preparingData.value.receiverAddrr,
        utxo: initialUtxo,
        mnemonic: preparingData.value.mnemonic,
        senderAddr: preparingData.value.address,
        derivationPath: listAddress.value.find(item => item.id === preparingData.value.address)?.derivationPath || []
      }
      progressMessage.value = 'Setting up Hydra'
      const rs = await hydraApi.openHydraHead({
        mnemonic: preparingData.value.mnemonic,
        address: preparingData.value.address,
        derivationPath: listAddress.value.find(item => item.id === preparingData.value.address)?.derivationPath || [],
        transaction: {
          txId: preparingData.value.utxo.split('#')[0],
          index: +preparingData.value.utxo.split('#')[1],
          value: +preparingData.value.amount
        }
      })
      progressMessage.value = 'Initializing...'
      progress.value = 80
      const isOpened = await waitHydraOpened()
      if (isOpened) {
        progress.value = 90
        setTimeout(() => {
          progress.value = 100
          progressMessage.value = 'Starting...'
          emits('PrepareSuccess', initialUtxo)
        }, 1000)
      }
      // const rs = await hydraApi.commit({
      //   txId: preparingData.value.utxo,
      //   utxo: { [preparingData.value.utxo]: UTxOs.value[preparingData.value.utxo] }
      // })
      console.log('startFastTransfer', rs)
    } catch (error: any) {
      current.value = Step.ENTER_PASSPHRASE
      message.error('Error: ' + error?.data?.detail || error?.data?.message || error?.message)
      console.error('startFastTransfer', error)
    }
  }

  async function waitHydraOpened() {
    try {
      const rs = await hydraApi.getHydraState({})
      if (rs === HydraState.OPEN) {
        console.log('Hydra opened')
        return true
      } else {
        await new Promise(resolve => setTimeout(resolve, 10000))
        return waitHydraOpened()
      }
    } catch (error) {
      console.error('waitHydraOpened', error)
      return false
    }
  }
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <a-steps v-model:current="current" :items="items" size="small" class="preparing-steps flex-shrink-0"> </a-steps>
    <div class="mt-2 flex-grow overflow-y-auto pt-2" border="t-1 t-solid t-gray-2">
      <div class="" v-if="steps[current].key === 'SELECT_ADDRESS'">
        <a-radio-group v-model:value="preparingData.address" name="radioGroup" class="w-full" size="small">
          <a-radio :value="item.id" v-for="item in listAddress" :key="item.id" class="address-radio !mr-0 mb-1 w-full">
            <div class="flex min-h-10 items-center">
              <div class="flex-grow-1">
                <div class="text-sm">{{ formatId(item.id, 12, 16) }}</div>
                <div class="font-400 text-gray-5 text-xs">({{ item.derivationPath.join('/') }})</div>
              </div>
              <div class="flex w-10 flex-shrink-0 items-center justify-center">
                <span
                  v-show="item.utxos?.length"
                  class="text-8px py-2px rounded-1 ws-nowrap px-1 uppercase"
                  :class="[item.state === 'unused' ? 'bg-[#FFF4F3] text-[#D63C37]' : 'bg-[#F3FFF6] text-[#16BD4F]']"
                >
                  {{ item.utxos?.length || 0 }} UTxOs
                </span>
              </div>
            </div>
          </a-radio>
        </a-radio-group>
      </div>
      <div class="" v-else-if="steps[current].key === 'SELECT_UTXO'">
        <a-radio-group
          v-model:value="preparingData.utxo"
          name="radioGroup"
          class="w-full"
          size="small"
          @change="onSelectUtxo"
        >
          <a-radio
            :value="item.txId"
            :disabled="hasPolicyId(item.value)"
            v-for="item in listUTxOs"
            :key="item.txId"
            class="address-radio !mr-0 mb-1 w-full"
          >
            <div class="flex min-h-10 items-center">
              <div class="flex-grow-1">
                <div class="text-gray-5 text-sm">{{ formatId(item.txId, 8, 12) }}</div>
                <div class="font-600 text-gray-8 text-xs">{{ hasPolicyId(item.value) ? 'NFT/Token' : '' }}</div>
              </div>
              <div class="">
                <span class="">{{ convertAmountDecimal(item.value.lovelace / 1e6, 'ADA') }} ₳</span>
              </div>
            </div>
          </a-radio>
        </a-radio-group>
        <base-loading v-if="isLoadingUxto" :size="28" />
        <div v-else-if="!isLoadingUxto && !listUTxOs.length">
          <p class="font-400 text-center text-sm text-black">No UTxO</p>
        </div>
      </div>
      <div class="" v-else-if="steps[current].key === 'ENTER_RECEIVER'">
        <div class="flex items-center">
          <a-textarea
            v-model:value="preparingData.receiverAddrr"
            placeholder="Input receiver address"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            class="!rounded-4"
          />
        </div>
      </div>
      <div class="" v-else-if="steps[current].key === 'ENTER_PASSPHRASE'">
        <div class="seedphrase--blur flex items-center">
          <!-- <a-input
            v-model:value="preparingData.mnemonic"
            class="!rounded-3 !bg-gray-1 border-gray-3 !h-10 !w-full"
            placeholder="Enter your mnemonic"
          /> -->
          <a-textarea
            v-model:value="preparingData.mnemonic"
            placeholder="Your mnemonic "
            :auto-size="{ minRows: 4, maxRows: 6 }"
            class="!rounded-4"
          />
        </div>
      </div>
      <div
        class="flex h-full w-full flex-col items-center justify-center overflow-hidden"
        v-else-if="steps[current].key === 'INIT_HYDRA'"
      >
        <base-loading :size="28" />
        <a-progress :percent="progress" size="small" strokeColor="#16BD4F" />
        <p class="mt-4 text-sm">{{ progressMessage }}</p>
      </div>
    </div>
    <div class="mt-4 flex">
      <a-button
        type="default"
        :disabled="getDisabled(steps[current].key)"
        class="btn-primary w-full"
        @click="onClickContinue()"
      >
        Continue
      </a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  :deep(.address-radio span:nth-child(2)) {
    flex-grow: 1;
  }

  :deep(.preparing-steps) {
    .ant-steps-item-description {
      @apply font-500 !text-gray-4 text-xs;
    }
    &.ant-steps .ant-steps-item-process .ant-steps-item-icon {
      @apply bg-primary !border-primary !text-white;
    }
    &.ant-steps .ant-steps-item-finish {
      .ant-steps-item-icon {
        @apply bg-[#16BD4F0b];

        .ant-steps-icon {
          @apply text-primary;
        }
      }
      .ant-steps-item-tail::after {
        @apply bg-primary;
      }
    }
  }

  .seedphrase--blur {
    cursor: pointer;
    filter: blur(3px);
    transition: filter 0.3s;
  }
</style>
