<script lang="ts" setup>
  import BaseSkeleton from '@/components/base/Skeleton.vue'

  import { Html5QrcodeScanner } from 'html5-qrcode'
  import { formatId, formatNumber } from '@/utils/format'
  import getRepository, { RepoName } from '@/repositories'
  import { TxsRepository } from '@/repositories/transaction'
  import type { FormInstance, FormItemInstance, FormProps, Rule } from 'ant-design-vue/es/form'
  import { message } from 'ant-design-vue'
  import type { IWalletAsset } from '../interfaces'
  import { storeToRefs } from 'pinia'
  import PopupSelectAsset from '../popups/PopupSelectAsset.vue'

  interface ITransferAsset {
    policyId: string
    assetName: string
    quantity: number
  }

  const txsApi = getRepository(RepoName.Transaction) as TxsRepository
  const auth = useAuthV2()
  const { currentWallet, walletAssets } = storeToRefs(auth)
  const walletCore = useWalletCore()

  const showPopupConfirm = ref(false)
  const showPopupScanQrCode = ref(false)
  const html5QrcodeScanner = ref<Html5QrcodeScanner | null>(null)
  const loadingEstimateFee = ref(false)
  const loadingCreateTxs = ref(false)

  const formTransfer = reactive({
    receiverAddress: '',
    passphrase: '',
    amount: '',
    assets: [] as ITransferAsset[],
    fee: '0'
  })

  const rules: Partial<Record<keyof typeof formTransfer, Rule[]>> = {
    receiverAddress: [{ required: true, message: '', trigger: 'blur' }],
    amount: [{ required: true, message: 'Please input amount', trigger: 'blur' }],
    fee: [{ required: true, message: 'Please input fee', trigger: 'blur' }]
  }

  const formRef = ref<FormInstance | null>(null)
  const refInputPassphrase = ref<HTMLInputElement | null>(null)
  const isErrorPassphrase = ref(false)
  const isValidReceiverAddress = computed(() => {
    return walletCore.validateWalletAddress(formTransfer.receiverAddress)
  })
  const isDisabledTransferBtn = computed(() => {
    return (
      !formTransfer.receiverAddress ||
      (!formTransfer.amount && !formTransfer.assets.length) ||
      !isValidReceiverAddress.value
    )
  })

  const handleFinish: FormProps['onFinish'] = values => {
    console.log(values, formTransfer)
  }
  const handleFinishFailed: FormProps['onFinishFailed'] = errors => {
    console.log(errors)
  }

  function onClickTransfer() {
    if (formTransfer.assets.length && !formTransfer.amount) {
      formTransfer.amount = '0'
    }
    formRef.value?.validate().then(() => {
      console.log('Transfer', formTransfer)
      showPopupConfirm.value = true
      nextTick(() => refInputPassphrase.value?.focus())
      estimateFee()
    })
  }

  async function estimateFee() {
    if (!currentWallet.value) return

    try {
      loadingEstimateFee.value = true
      const fee = await txsApi.estimateFee(currentWallet.value.id, {
        payments: [
          {
            amount: {
              quantity: +formTransfer.amount * 10 ** 6,
              unit: 'lovelace'
            },
            address: formTransfer.receiverAddress,
            assets: []
          }
        ]
      })
      formTransfer.fee = (fee.estimated_max.quantity / 10 ** 6).toString()
    } catch (error: any) {
      if (error?.data?.detail?.code === 'not_enough_money') {
        message.error('Not enough money', 2)
        return
      }
      message.error('Failed to estimate fee', 2)
    } finally {
      loadingEstimateFee.value = false
    }
  }

  async function createTxs() {
    try {
      if (!currentWallet.value) return
      if (!formTransfer.passphrase) {
        isErrorPassphrase.value = true
        return
      } else {
        isErrorPassphrase.value = false
      }
      loadingCreateTxs.value = true
      const rs = await txsApi.createTransaction(currentWallet.value.id, {
        payments: [
          {
            amount: {
              quantity: +formTransfer.amount * 10 ** 6,
              unit: 'lovelace'
            },
            address: formTransfer.receiverAddress,
            assets: formTransfer.assets.map(asset => ({
              policy_id: asset.policyId,
              // convert UTF-8 to hex
              asset_name: Buffer.from(asset.assetName, 'utf-8').toString('hex'),
              quantity: asset.quantity
            }))
          }
        ],
        passphrase: formTransfer.passphrase
      })
      if (rs) {
        message.success('Transaction created successfully', 2)
        showPopupConfirm.value = false
        formTransfer.passphrase = ''
        formTransfer.amount = ''
        formTransfer.assets = []
        useRouter().push({ name: 'Home' })
      }
    } catch (error: any) {
      if (error?.data?.detail?.code === 'wrong_encryption_passphrase') {
        isErrorPassphrase.value = true
        message.error('Wrong passphrase', 2)
        return
      }
      if (error?.data?.detail?.message) {
        message.error(error?.data?.detail?.message, 5)
        return
      }
      message.error('Failed to create transaction', 2)
    } finally {
      loadingCreateTxs.value = false
    }
  }

  function pasteFromClipboard() {
    navigator.clipboard.readText().then(text => {
      formTransfer.receiverAddress = text
      message.success('Pasted from clipboard', 2)
    })
  }

  function initQrCodeScanner() {
    html5QrcodeScanner.value = new Html5QrcodeScanner(
      'reader-qrcode',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    )
    function onScanSuccess(decodedText: any, decodedResult: any) {
      // handle the scanned code as you like, for example:
      // console.log(`Code matched = ${decodedText}`, decodedResult)
      if (decodedText) {
        if (!walletCore.validateWalletAddress(decodedText)) {
          message.error('Invalid address', 2)
        } else {
          formTransfer.receiverAddress = decodedText
          showPopupScanQrCode.value = false
        }
        html5QrcodeScanner.value?.clear()
      }
    }

    function onScanFailure(error: any) {
      // handle scan failure, usually better to ignore and keep scanning.
      // for example:
      // console.warn(`Code scan error = ${error}`)
    }
    html5QrcodeScanner.value?.render(onScanSuccess, onScanFailure)
  }

  function startScanQrCode() {
    showPopupScanQrCode.value = true
    nextTick(() => {
      initQrCodeScanner()
    })
  }

  watch(showPopupScanQrCode, value => {
    if (!value && html5QrcodeScanner.value) {
      html5QrcodeScanner.value?.clear().then(() => {
        html5QrcodeScanner.value = null
      })
    }
  })

  // Popup show assets to add to transaction
  const showPopupAssets = ref(false)
  function onSelectAsset(selectedAsset: ITransferAsset) {
    const idx = formTransfer.assets.findIndex(asset => asset.policyId === selectedAsset.policyId)
    if (idx !== -1) {
      message.error('Asset already added', 2)
    } else {
      formTransfer.assets.push(selectedAsset)
    }
  }
  function getAssetData(item: ITransferAsset) {
    return walletAssets.value.find(asset => asset.policyId === item.policyId)!
  }
  function removeAsset(item: ITransferAsset) {
    formTransfer.assets = formTransfer.assets.filter(asset => asset.policyId !== item.policyId)
  }
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between bg-[#fff]">
    <div class="h-[56px] flex-shrink-0 bg-[#fff] px-4" border="b b-solid b-gray-3">
      <div class="flex h-full w-full items-center justify-between">
        <a-button type="ghost" class="" size="large" @click="$router.go(-1)">
          <icon icon="ic:outline-arrow-back" height="20" />
        </a-button>
      </div>
    </div>
    <div class="flex-grow-1 overflow-hidden p-4" v-if="currentWallet">
      <div class="flex h-full flex-col justify-between">
        <div class="flex-grow-1 flex flex-col overflow-hidden">
          <a-form
            layout="vertical"
            ref="formRef"
            hideRequiredMark
            :model="formTransfer"
            :rules="rules"
            @finish="handleFinish"
            @finishFailed="handleFinishFailed"
            class="form-transfer"
          >
            <div class="flex">
              <div class="rounded-3 flex-grow-1 px-4 py-2" border="1 solid gray-2">
                <p class="font-400 text-gray-4 !mb-0 text-xs">Address</p>
                <a-form-item label="" name="receiverAddress" class="!mb-0">
                  <a-input
                    v-model:value="formTransfer.receiverAddress"
                    :bordered="false"
                    placeholder="Enter the address of a recipient"
                    class="px-0"
                  >
                    <template #suffix>
                      <icon
                        icon="ic:outline-check"
                        v-if="isValidReceiverAddress"
                        height="16"
                        class="text-green-4 hover:cursor-pointer"
                      />
                      <icon
                        icon="ic:outline-content-paste"
                        height="16"
                        class="hover:cursor-pointer"
                        @click="pasteFromClipboard()"
                      />
                    </template>
                  </a-input>
                </a-form-item>
              </div>
              <div class="mx-4 flex flex-shrink-0 items-center">
                <icon icon="ic:outline-qrcode" height="16" class="hover:cursor-pointer" @click="startScanQrCode()" />
              </div>
            </div>
            <div class="mt-4 flex">
              <a-form-item label="" name="amount" class="mr-4 flex-grow">
                <a-input
                  v-model:value="formTransfer.amount"
                  placeholder="0.00000"
                  class="rounded-2 !border-[#0a0b0d] !py-2"
                >
                  <template #prefix> ₳ </template>
                </a-input>
              </a-form-item>
              <a-button type="default" class="btn-tertiary" @click="showPopupAssets = true" :loading="false">
                + Assets
              </a-button>
            </div>
          </a-form>
          <div class="flex-grow overflow-auto">
            <div
              class="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-2 transition-all"
              border="1 solid #c7bab8"
              hover="cursor-pointer bg-[#c7bab8] bg-opacity-10"
              v-for="(item, index) in formTransfer.assets"
              :key="item.policyId"
            >
              <div class="flex w-full items-center">
                <div
                  class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white"
                  border="1 solid #c7bab8"
                >
                  <image-loader
                    :imageHash="getAssetData(item).imageHash"
                    class="h-full w-full rounded-full object-contain"
                  />
                </div>
                <div class="flex-grow-1 ml-4 flex flex-col justify-center">
                  <span class="text-body-1 font-700">{{ getAssetData(item).assetName }}</span>
                  <span class="text-body-1 font-500 text-primary">
                    {{ formatNumber(item.quantity || 0) }}
                  </span>
                </div>
                <div class="ml-4 flex items-center justify-between">
                  <icon
                    icon="ic:outline-close"
                    height="20"
                    class="text-gray-900 hover:cursor-pointer"
                    @click="removeAsset(item)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="w-full">
          <a-button
            type="default"
            class="btn-primary mb-4 w-full"
            size="large"
            @click="onClickTransfer()"
            :disabled="isDisabledTransferBtn"
          >
            Send
          </a-button>
        </div>
      </div>
    </div>
    <a-modal v-model:open="showPopupConfirm" title="Confirm transaction" :closable="false" class="modal-txs-fee">
      <div class="pt-4">
        <div class="mb-2 flex flex-col items-center justify-center">
          <p class="font-500 text-gray-9 !mb-0 text-center text-3xl">
            {{ parseFloat(formTransfer.amount).toFixed(2) }} ₳
          </p>
          <div class="rounded-2 bg-green-200 px-2 py-1 text-gray-900" border="1 solid gray-900">
            + {{ formTransfer.assets.length }} assets
          </div>
        </div>
        <p class="text-gray-9 font-400 mb-2 text-center text-base">to</p>
        <div class="rounded-2 flex items-center justify-between p-2" border="1 solid gray-4">
          <p class="mb-0">{{ formatId(formTransfer.receiverAddress, 20, 7) }}</p>
        </div>
        <a-form-item label="" name="passphrase" class="mt-2" :validate-status="isErrorPassphrase ? 'error' : ''">
          <a-input-password
            ref="refInputPassphrase"
            v-model:value="formTransfer.passphrase"
            placeholder="Password"
            type="password"
          >
            <template #prefix>
              <icon icon="ic:outline-lock" height="18" color="#4d4d4d" />
            </template>
          </a-input-password>
        </a-form-item>
        <div class="mt-2" v-if="loadingEstimateFee">
          <base-skeleton type="text" :height="24" :loading="true" class="w-30 mx-a" />
        </div>
        <p class="text-gray-9 font-400 mb-2 mt-2 text-center text-base" v-else>{{ formTransfer.fee }}₳ fee</p>
      </div>
      <template #footer>
        <div class="mt-6">
          <a-button
            type="default"
            class="!rounded-4 bg-primary mb-0 !h-[44px] w-full !px-4"
            size="large"
            @click="createTxs()"
            :loading="loadingCreateTxs"
            :disabled="!formTransfer.passphrase || !formTransfer.amount || !formTransfer.receiverAddress"
          >
            <div class="inline-flex items-center justify-center">
              <span class="font-600 text-body-1 text-[#fff]">Send</span>
            </div>
          </a-button>
        </div>
      </template>
    </a-modal>
    <a-modal
      v-model:open="showPopupScanQrCode"
      title="Scan address"
      :closable="false"
      class="modal-scan-qrcode"
      :footer="null"
    >
      <div id="reader-qrcode" class="w-full"></div>
    </a-modal>
    <PopupSelectAsset v-model:open="showPopupAssets" @submit="onSelectAsset" />
  </div>
</template>

<style lang="scss">
  .modal-txs-fee {
    .ant-modal-content {
      padding: 16px !important;
    }
  }
</style>
