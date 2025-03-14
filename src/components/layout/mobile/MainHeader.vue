<script lang="ts" setup>
  import { formatId } from '@/utils/format'
  import { useCopy } from '@/utils/useCopy'

  const isShowQrCode = ref(false)

  const { currentWalletAddress, setCurrentWalletAddress, setCurrentWallet } = useAuthV2()

  const qrAddress = computed(() => {
    return currentWalletAddress?.address || ''
  })
</script>

<template>
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

    <a-drawer
      v-model:open="isShowQrCode"
      class="rounded-t-3 !bg-[#fff]"
      root-class-name="root-class-name"
      placement="bottom"
      :closable="false"
      :height="300"
    >
      <div class="flex justify-center">
        <a-qrcode error-level="H" :value="qrAddress" icon="/logo-100x100.svg" />
      </div>
      <div class="mt-8 flex items-center">
        <div class="flex-grow text-left">
          <span class="text-body-1 font-400 text-gray-6">HYDRA address</span>
          <div class="text-body-1 text-gray-8 mt-1">
            {{ formatId(qrAddress, 10, 7) }}
          </div>
        </div>
        <div class="flex-shrink-0">
          <a-button
            type="default"
            class="!rounded-3 !bg-primary btn-shadow-primary border-primary flex !h-10 !w-full items-center text-white"
            @click="useCopy(qrAddress)"
          >
            <icon icon="tabler:copy" height="18" class="mr-1" /> Copy
          </a-button>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<style lang="scss" scoped></style>
