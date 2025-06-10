<script lang="ts" setup>
  const visible = defineModel('open', { type: Boolean, default: true })
  const emits = defineEmits<{
    submit: [string]
  }>()
  const password = ref('')
  const refPasswordInput = ref<HTMLInputElement | null>(null)

  watch(
    () => visible.value,
    () => {
      if (visible.value) {
        password.value = ''
        nextTick(() => {
          refPasswordInput.value?.focus()
        })
      }
    }
  )
</script>

<template>
  <div class="">
    <a-modal
      v-model:open="visible"
      width="270px"
      title=""
      centered
      :closable="true"
      :mask-closable="true"
      :footer="false"
      :bodyStyle="{ padding: '0' }"
      class="popup-input-password"
    >
      <div class="flex flex-col justify-center p-4">
        <!-- <div class="text-base font-semibold">Input password to join room?</div> -->
        <div class="">
          <a-form layout="vertical" :model="{ password }">
            <a-form-item
              label="Input password to join room"
              name="password"
              :rules="[{ required: true, message: 'Please input your password!', trigger: 'blur' }]"
            >
              <a-input-password
                ref="refPasswordInput"
                v-model:value="password"
                placeholder="Password"
                type="password"
                class="w-full"
                size="large"
              />
            </a-form-item>
          </a-form>
        </div>
        <div class="">
          <a-button
            :disabled="!password"
            class="btn-primary w-full"
            type="primary"
            size="large"
            @click="emits('submit', password)"
          >
            Join
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style lang="scss">
  .popup-input-password {
    .ant-modal-content {
      padding: 0 !important;
    }
    .ant-modal-close {
      top: 8px;
      right: 8px;
    }
  }
</style>
