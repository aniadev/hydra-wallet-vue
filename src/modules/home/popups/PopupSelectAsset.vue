<script lang="ts" setup>
  import { formatNumber } from '@/utils/format'
  import { storeToRefs } from 'pinia'

  const auth = useAuthV2()
  const { walletAssets } = storeToRefs(auth)

  const showPopupAssets = defineModel('open', { type: Boolean, default: false })
  const emits = defineEmits<{
    submit: [typeof selectedAsset.value]
  }>()

  const showPopupQuantity = ref(false)
  const selectedAsset = ref({
    policyId: '',
    assetName: '',
    quantity: 0
  })
  const isErrorPassphrase = ref(false)

  function selectAsset(item: (typeof walletAssets.value)[0]) {
    // console.log('>>> / file: PopupSelectAsset.vue:22 / item:', item)

    selectedAsset.value.policyId = item.policyId
    selectedAsset.value.assetName = item.assetName
    selectedAsset.value.quantity = +(item.quantity || 0)
    showPopupQuantity.value = true
  }

  function submit() {
    if (selectedAsset.value.quantity <= 0) {
      isErrorPassphrase.value = true
      return
    }
    isErrorPassphrase.value = false
    emits(
      'submit',
      Object.assign(
        {},
        {
          policyId: selectedAsset.value.policyId,
          assetName: selectedAsset.value.assetName,
          quantity: +selectedAsset.value.quantity
        }
      )
    )
    showPopupQuantity.value = false
    showPopupAssets.value = false
  }
</script>

<template>
  <a-modal
    v-model:open="showPopupAssets"
    title="Select assets"
    :closable="true"
    class="modal-select-assets"
    :footer="null"
  >
    <div class="">
      <div
        class="mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-4 transition-all"
        border="1 solid #c7bab8"
        hover="cursor-pointer bg-[#c7bab8] bg-opacity-10"
        v-for="(item, index) in walletAssets"
        :key="item.policyId"
        @click="selectAsset(item)"
      >
        <div class="flex w-full items-center">
          <div
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white"
            border="1 solid #c7bab8"
          >
            <image-loader :imageHash="item.imageHash" class="h-full w-full rounded-full object-contain" />
          </div>
          <div class="flex-grow-1 ml-4 flex items-center justify-between">
            <span class="text-body-1 font-700">{{ item.policyName }}</span>
            <span class="text-body-1 font-500 text-primary">
              {{ formatNumber(item.quantity || 0) }}
            </span>
          </div>
        </div>
      </div>
      <div class="" v-if="walletAssets.length == 0">
        <p class="font-600 text-center text-sm">No assets</p>
      </div>
    </div>
  </a-modal>

  <a-modal
    v-model:open="showPopupQuantity"
    title="Input quantity"
    :closable="true"
    class="modal-input-quantity-asset"
    @ok="submit()"
  >
    <div class="">
      <a-form-item label="" name="quantity" class="mt-2" :validate-status="isErrorPassphrase ? 'error' : ''">
        <a-input ref="refInputQuantity" v-model:value="selectedAsset.quantity" placeholder="Quantity" type="number">
          <!-- <template #prefix>
              <icon icon="ic:outline-lock" height="18" color="#4d4d4d" />
            </template> -->
        </a-input>
      </a-form-item>
    </div>
  </a-modal>
</template>

<style lang="scss" scoped></style>
