<script lang="ts" setup>
  import BaseSkeleton from '@/components/base/Skeleton.vue'

  import { Html5QrcodeScanner } from 'html5-qrcode'
  import { formatId } from '@/utils/format'
  import getRepository, { RepoName } from '@/repositories'
  import { TxsRepository } from '@/repositories/transaction'
  import type { FormInstance, FormItemInstance, FormProps, Rule } from 'ant-design-vue/es/form'
  import { message } from 'ant-design-vue'

  const txsApi = getRepository(RepoName.Transaction) as TxsRepository
  const { currentWallet } = useAuthV2()
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

  const handleFinish: FormProps['onFinish'] = values => {
    console.log(values, formTransfer)
  }
  const handleFinishFailed: FormProps['onFinishFailed'] = errors => {
    console.log(errors)
  }

  function onClickTransfer() {
    formRef.value?.validate().then(() => {
      console.log('Transfer', formTransfer)
      showPopupConfirm.value = true
      nextTick(() => refInputPassphrase.value?.focus())
      estimateFee()
    })
  }

  async function estimateFee() {
    if (!currentWallet) return

    try {
      loadingEstimateFee.value = true
      const fee = await txsApi.estimateFee(currentWallet.id, {
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
      if (!currentWallet) return
      if (!formTransfer.passphrase) {
        isErrorPassphrase.value = true
        return
      } else {
        isErrorPassphrase.value = false
      }
      loadingCreateTxs.value = true
      const rs = await txsApi.createTransaction(currentWallet.id, {
        payments: [
          {
            amount: {
              quantity: +formTransfer.amount * 10 ** 6,
              unit: 'lovelace'
            },
            address: formTransfer.receiverAddress,
            assets: []
          }
        ],
        passphrase: formTransfer.passphrase
      })
      if (rs) {
        message.success('Transaction created successfully', 2)
        showPopupConfirm.value = false
        formTransfer.passphrase = ''
        formTransfer.amount = ''
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
    <div class="flex-grow-1 p-4" v-if="currentWallet">
      <div class="flex h-full flex-col justify-between">
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
          <a-form-item label="" name="amount" class="mt-4">
            <a-input
              v-model:value="formTransfer.amount"
              placeholder="0.00000"
              class="rounded-2 !border-[#0a0b0d] !py-2"
            >
              <template #prefix> ₳ </template>
            </a-input>
          </a-form-item>
        </a-form>
        <div class="w-full">
          <a-button
            type="default"
            class="!rounded-4 bg-primary mb-4 !h-[70px] w-full !px-4"
            size="large"
            @click="onClickTransfer()"
            :disabled="!formTransfer.amount || !isValidReceiverAddress"
          >
            <div class="flex items-center justify-center">
              <span class="font-600 text-body-1 text-[#fff]">Send</span>
            </div>
          </a-button>
        </div>
      </div>
    </div>
    <a-modal v-model:open="showPopupConfirm" title="Confirm transaction" :closable="false" class="modal-txs-fee">
      <div class="">
        <p class="font-500 text-gray-9 mb-2 text-center text-2xl">{{ parseFloat(formTransfer.amount).toFixed(2) }} ₳</p>
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
  </div>
</template>

<style lang="scss">
  .modal-txs-fee {
    .ant-modal-content {
      padding: 16px !important;
    }
  }
</style>
