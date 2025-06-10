<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import type { HydraGameRepository } from '@/repositories/game'
  import type { FormInstance } from 'ant-design-vue'
  import Cookies from 'js-cookie'
  import { useGameAuthStore } from '../stores/gameAuthStore'

  const router = useRouter()
  const showModal = defineModel('open', { type: Boolean, default: false })

  const handleOk = () => {
    showModal.value = false
  }

  const handleCancel = () => {
    showModal.value = false
    router.push('/')
  }

  type FormCreateAccount = {
    alias: string
    password: string
  }

  const formCreate = reactive<FormCreateAccount>({
    alias: '',
    password: ''
  })
  const refFormCreate = ref<FormInstance>()
  const refAliasInput = ref<HTMLInputElement | null>(null)

  const { currentWalletAddress } = useAuthV2()
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository
  const isSubmitting = ref(false)
  const onFinish = async (values: FormCreateAccount) => {
    try {
      isSubmitting.value = true
      if (!currentWalletAddress?.address) {
        console.error('Wallet address not found')
        return
      }
      const rs = await hydraGameApi.createAccount({
        walletAddress: currentWalletAddress.address,
        password: values.password,
        alias: values.alias,
        avatar: 'https://i.ibb.co/QjcwGvbn/hydra-token.png'
      })
      if (!rs.data) throw new Error('Create account failed')
      const accountInfo = await hydraGameApi.getAccountInfo(rs.data.accessToken)
      if (!accountInfo.data) throw new Error('Cannot get account info')
      useGameAuthStore().setAccountLogin(accountInfo.data, rs.data.accessToken)
      showModal.value = false
    } catch (error) {
      console.error(error)
    } finally {
      isSubmitting.value = false
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const onFormMounted = async () => {
    await nextTick()
    formCreate.alias = currentWalletAddress?.address?.slice(-8) || ''
    // select all character in field:
    refAliasInput.value?.focus()
    await nextTick()
    refAliasInput.value?.setSelectionRange(0, formCreate.alias.length)
  }
</script>

<template>
  <div>
    <a-modal
      v-model:open="showModal"
      title="Create your game account to play game"
      @ok="handleOk"
      @cancel="handleCancel"
      :maskClosable="false"
      centered
      :closable="false"
      width="480px"
      :footer="false"
    >
      <a-form
        :model="formCreate"
        ref="refFormCreate"
        name="basic"
        class="form-create mt-4"
        label-align="left"
        layout="vertical"
        autocomplete="off"
        @finish="onFinish"
        @finishFailed="onFinishFailed"
        @vue:mounted="onFormMounted"
      >
        <a-form-item name="alias" :rules="[{ required: false }]">
          <template #label>
            <div class="flex w-full flex-col">
              <span>Alias</span>
              <span class="text-10px text-gray-4">(Only letters, numbers are allowed)</span>
            </div>
          </template>
          <a-input v-model:value="formCreate.alias" class="rounded-2 !border-[#0a0b0d] !py-2" ref="refAliasInput" />
        </a-form-item>

        <a-form-item
          name="password"
          :rules="[
            { required: true, message: 'Please input your password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]"
        >
          <template #label>
            <div class="flex w-full flex-col">
              <span>Password</span>
              <span class="text-10px text-gray-4"
                >(Must contain uppercase, number, special character, minimum 6 characters)</span
              >
            </div>
          </template>
          <a-input-password v-model:value="formCreate.password" class="rounded-2 !border-[#0a0b0d] !py-2" />
        </a-form-item>

        <a-form-item :wrapper-col="{ span: 24, offset: 0 }" class="!mb-0">
          <div class="flex items-center justify-end">
            <a-button @click="handleCancel" class="" size="large">Cancel</a-button>
            <a-button type="primary" html-type="submit" class="btn-primary ml-3" :loading="isSubmitting">
              Submit
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
    <slot name="reference">
      <a-button type="primary" @click="showModal = true">Create account</a-button>
    </slot>
  </div>
</template>

<style lang="scss" scoped>
  .form-create {
    :deep(.ant-form-item-label) {
      label {
        width: 100%;
      }
    }
  }
</style>
