<script lang="ts" setup>
  import { storeToRefs } from 'pinia'

  const auth = useAuthV2()
  const { rootKey } = storeToRefs(auth)
  const mnemonic = ref('')

  const emits = defineEmits<{
    auth: [rootKey: typeof rootKey.value]
    removeAuth: []
  }>()
  const onClickAuth = async () => {
    // const walletAddress = useWalletCore().getBaseAddressFromMnemonic(mnemonic.value).to_address().to_bech32()
    // get root key
    try {
      const _rootKey = useWalletCore().getRootKeyByMnemonic(mnemonic.value)
      emits('auth', _rootKey)
    } catch (error) {
      console.log(error)
    }
  }

  const onClickRemoveAuth = async () => {
    //
  }

  const generateMnemonic = () => {
    mnemonic.value = useWalletCore().generateMnemonic(160)
  }
</script>

<template>
  <div class="">
    <a-textarea v-model:value="mnemonic" placeholder="Mnemonic" :rows="3" allow-clear />
    <div class="mt-1 flex justify-between">
      <a-button @click="onClickAuth()" size="small" type="primary">Auth</a-button>
      <div class="flex items-center gap-2">
        <a-button @click="generateMnemonic()" size="small">Generate mnemonic</a-button>
        <a-button @click="onClickRemoveAuth()" size="small" danger>Remove Auth</a-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
