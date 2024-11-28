<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import SelectionScreen from '../components/SelectionScreen.vue'
  import getRepository, { RepoName } from '@/repositories'
  import { HydraRepository } from '@/repositories/hydra'
  import { HydraState, type UtxoObject } from '../interfaces'
  import BaseLoading from '@/components/base/Loading.vue'
  import TransferScreen from '../components/TransferScreen.vue'

  const hydraCore = useHydraCore()
  const auth = useAuthV2()
  const { currentWallet } = storeToRefs(auth)

  const hydraApi = getRepository(RepoName.Hydra) as HydraRepository

  const sessionData = useSessionStorage('hydra-demo', {
    receiverAddr: '',
    utxo: {} as UtxoObject,
    mnemonic: '',
    senderAddr: '',
    derivationPath: [] as string[]
  })

  onMounted(() => {
    console.log('mounted')
    getHydraState()
    hydraCore.initConnection()
  })

  onBeforeUnmount(() => {
    console.log('unmounted')
    hydraCore.closeConnection()
  })

  const isLoadingHydraState = ref(false)
  const hydraState = ref<HydraState>(HydraState.UNKNOWN)

  // Computed
  const fastTransferStatus = computed<'AVAILABLE' | 'UNAVAILABLE'>(() => {
    switch (hydraState.value) {
      case HydraState.INITIALIZING:
        return 'AVAILABLE'
      case HydraState.UNKNOWN:
        return 'UNAVAILABLE'
      case HydraState.IDLE:
        return 'AVAILABLE'
      case HydraState.OPEN:
        return 'AVAILABLE'
      case HydraState.FANOUTPOSSIBLE:
        return 'UNAVAILABLE'
      case HydraState.CLOSED:
        return 'AVAILABLE'
      case HydraState.FINAL:
        return 'AVAILABLE'
      default:
        return 'UNAVAILABLE'
    }
  })

  // Methods
  async function getHydraState() {
    try {
      isLoadingHydraState.value = true
      const rs = await hydraApi.getHydraState(currentWallet.value!.id)
      hydraState.value = rs
      if (rs === HydraState.OPEN) {
        // TODO: Prepare initial utxo
      }
    } catch (error) {
      console.error(error)
    } finally {
      isLoadingHydraState.value = false
    }
  }

  function onPreparingSuccess(_initialUtxo: UtxoObject) {
    hydraState.value = HydraState.OPEN
  }
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between bg-[#fff]">
    <div
      class="h-[56px] flex-shrink-0 bg-[#fff] px-4"
      border="b b-solid b-gray-3"
      v-if="hydraState !== HydraState.OPEN"
    >
      <div class="flex h-full w-full items-center justify-between">
        <a-button type="ghost" class="" size="large" @click="$router.push({ name: 'Home' })">
          <icon icon="ic:outline-arrow-back" height="20" />
        </a-button>
      </div>
    </div>
    <div class="flex-grow-1 flex flex-col items-center justify-center overflow-y-hidden p-4" v-if="currentWallet">
      <template v-if="fastTransferStatus === 'AVAILABLE'">
        <SelectionScreen v-if="hydraState !== HydraState.OPEN" @prepare-success="onPreparingSuccess" />
        <TransferScreen
          v-else-if="hydraState === HydraState.OPEN && currentWallet && sessionData.mnemonic"
          :session-data="sessionData"
          :wallet="{
            id: currentWallet.id
          }"
          @on-finished="getHydraState"
        />
        <p class="" v-else>Hydra is unavailable</p>
      </template>
      <template v-else>
        <p class="" v-if="!isLoadingHydraState">Hydra is unavailable</p>
        <p class="" v-else>Loading</p>
      </template>
      <base-loading v-if="isLoadingHydraState" :size="20" />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
