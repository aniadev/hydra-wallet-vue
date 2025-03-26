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

  type FormLogin = {
    address: string
    password: string
  }

  const formLogin = reactive<FormLogin>({
    address: '',
    password: ''
  })
  const refFormLogin = ref<FormInstance>()

  const { currentWalletAddress } = useAuthV2()
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository
  const isSubmitting = ref(false)
  const onFinish = async (values: FormLogin) => {
    try {
      isSubmitting.value = true
      if (!currentWalletAddress?.address) {
        console.error('Wallet address not found')
        return
      }
      const loginRs = await hydraGameApi.signIn({
        address: currentWalletAddress.address,
        password: values.password
      })
      if (!loginRs.data) throw new Error('Login failed')
      const userInfo = await hydraGameApi.getAccountInfo(currentWalletAddress.address)
      useGameStore().setAccountLogin(userInfo.data, loginRs.data.accessToken)
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

  const refPasswordInput = ref<HTMLInputElement | null>(null)

  watch(
    () => showModal.value,
    async value => {
      if (value) {
        if (!currentWalletAddress?.address) {
          console.error('Wallet address not found')
          return
        }
        formLogin.address = currentWalletAddress.address
        await nextTick()
        refPasswordInput.value?.focus()
      }
    }
  )
</script>

<template>
  <div>
    <a-modal
      v-model:open="showModal"
      title="Login to play games"
      @ok="handleOk"
      @cancel="handleCancel"
      :maskClosable="false"
      centered
      :closable="false"
      width="480px"
      :footer="false"
    >
      <a-form
        :model="formLogin"
        ref="refFormLogin"
        name="basic"
        class="mt-4"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 19 }"
        autocomplete="off"
        @finish="onFinish"
        @finishFailed="onFinishFailed"
      >
        <a-form-item label="Address" name="address" :rules="[{ required: true }]">
          <a-input readonly v-model:value="formLogin.address" class="rounded-2 !border-[#0a0b0d] !py-2" />
        </a-form-item>

        <a-form-item
          label="Password"
          name="password"
          :rules="[
            { required: true, message: 'Please input your password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]"
        >
          <a-input-password
            ref="refPasswordInput"
            v-model:value="formLogin.password"
            class="rounded-2 !border-[#0a0b0d] !py-2"
          />
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
