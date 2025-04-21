<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import type { HydraGameRepository } from '@/repositories/game'
  import type { FormInstance } from 'ant-design-vue'
  import Cookies from 'js-cookie'
  import { useGameStore } from '../stores/gameStore'

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
        address: currentWalletAddress.address,
        password: values.password,
        alias: values.alias
      })
      if (!rs.data) throw new Error('Create account failed')
      const loginRs = await hydraGameApi.signIn({
        address: currentWalletAddress.address,
        password: values.password
      })
      if (!loginRs.data) throw new Error('Login failed')
      useGameStore().setAccountLogin(rs.data, loginRs.data.accessToken)
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
        class="mt-4"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 19 }"
        autocomplete="off"
        @finish="onFinish"
        @finishFailed="onFinishFailed"
      >
        <a-form-item label="Alias" name="alias" :rules="[{ required: false }]">
          <a-input v-model:value="formCreate.alias" class="rounded-2 !border-[#0a0b0d] !py-2" />
        </a-form-item>

        <a-form-item
          label="Password"
          name="password"
          :rules="[
            { required: true, message: 'Please input your password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]"
        >
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

<style lang="scss" scoped></style>
