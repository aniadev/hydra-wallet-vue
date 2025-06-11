<script lang="ts" setup>
  import getRepository, { RepoName } from '@/repositories'
  import type { HydraGameRepository } from '@/repositories/game'
  import { message, type FormInstance } from 'ant-design-vue'
  import Cookies from 'js-cookie'
  import { useGameAuthStore } from '../stores/gameAuthStore'
  import { Popups } from '@/enums/popups.enum'

  const router = useRouter()
  const showModal = computed(() => {
    return usePopupState(Popups.POPUP_GAME_LOGIN)
  })

  const handleOk = () => {
    usePopupState(Popups.POPUP_GAME_LOGIN, 'close')
  }

  const handleCancel = () => {
    usePopupState(Popups.POPUP_GAME_LOGIN, 'close')
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
  const refPasswordFormItem = ref()
  const errorMessage = ref('')

  const { currentWalletAddress } = useAuthV2()
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository
  const isSubmitting = ref(false)
  const onFinish = async (values: FormLogin) => {
    try {
      isSubmitting.value = true
      errorMessage.value = ''
      if (!currentWalletAddress?.address) {
        console.error('Wallet address not found')
        return
      }
      const loginRs = await hydraGameApi.signIn({
        walletAddress: currentWalletAddress.address,
        password: values.password
      })
      if (!loginRs.data) throw new Error('Login failed')
      const userInfo = await hydraGameApi.getAccountInfo(loginRs.data.accessToken)
      useGameAuthStore().setAccountLogin(userInfo.data, loginRs.data.accessToken)
      usePopupState(Popups.POPUP_GAME_LOGIN, 'close')
    } catch (error: any) {
      console.error(error)
      if (error.statusCode === 401) {
        errorMessage.value = 'Error credentials'
      }
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
        formLogin.password = ''
        errorMessage.value = ''
        await nextTick()
        refPasswordInput.value?.focus()
      }
    }
  )

  // Add password validation regex
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,}$/

  //
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
        autocomplete="off"
        layout="vertical"
        @finish="onFinish"
        @finishFailed="onFinishFailed"
      >
        <a-form-item label="Wallet address" name="address" :rules="[{ required: true }]" class="!mb-3">
          <a-input readonly v-model:value="formLogin.address" class="rounded-2 !border-[#0a0b0d] !py-2" />
        </a-form-item>
        <a-form-item
          ref="refPasswordFormItem"
          label="Password"
          name="password"
          class="!mb-0"
          :rules="[
            { required: true, message: 'Please input your password!' },
            { min: 6, message: 'Password must be at least 6 characters!' },
            {
              pattern: passwordRegex,
              message:
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character!'
            }
          ]"
        >
          <a-input-password
            ref="refPasswordInput"
            v-model:value="formLogin.password"
            class="rounded-2 !border-[#0a0b0d] !py-2"
          />
          <p class="text-error-400 h-5 pl-3 text-sm">{{ errorMessage }}</p>
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
