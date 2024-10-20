<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import { HydraRepository } from '@/repositories/hydra'

  const hydraApi = getRepository(RepoName.Hydra) as HydraRepository
  const msg = ref('TEST')
  const formData = reactive({
    sender:
      'addr_test1qq65k3mk7nledlttp3jqdwkzjpa7076tqyrnsm3zpv0ac5p4fdrhda8ljm7kkrryq6av9yrmula5kqg88phzyzclm3gq3w8yky',
    derivationPath: ['1852H', '1815H', '0H', '0', '0'],
    mnemonic: 'card warm script lyrics soul despair scare capable recycle region orchard flee leader rifle badge',
    receiver:
      'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
    amount: '1'
  })
  const test = () => {
    console.log('test')

    hydraApi
      .construct({
        amount: Number.parseFloat(formData.amount) * 1e6,
        sender: formData.sender,
        receiver: formData.receiver,
        derivationPath: formData.derivationPath,
        mnemonic: formData.mnemonic
      })
      .then(signedTxCborHex => {
        console.log(signedTxCborHex)
        return hydraApi.transfer({ cborHex: signedTxCborHex })
      })
      .then(res => {
        console.log(res)
      })
      .catch(err => {
        console.log(err)
      })
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-center p-6">
    <div class="w-full">
      <a-form size="small">
        <a-form-item label="Sender">
          <a-textarea v-model:value="formData.sender" />
        </a-form-item>
        <a-form-item label="Mnemonic">
          <a-textarea v-model:value="formData.mnemonic" />
        </a-form-item>
        <a-form-item label="Derivation Path">
          <a-input :value="formData.derivationPath.join(',')" />
        </a-form-item>
        <a-form-item label="Receiver">
          <a-textarea v-model:value="formData.receiver" />
        </a-form-item>
        <a-form-item label="Amount">
          <a-input v-model:value="formData.amount" />
        </a-form-item>
      </a-form>
    </div>
    <a-button @click="test"> TEST </a-button>
  </div>
</template>

<style lang="scss" scoped></style>
