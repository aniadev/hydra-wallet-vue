<script lang="ts" setup>
  import Background from './Background.vue'

  const emits = defineEmits<{
    ready: []
  }>()

  const isLoading = ref(false)
  const animatedOut = ref(false)
  const onClickReady = async () => {
    //
    isLoading.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    animatedOut.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    emits('ready')
  }
</script>

<template>
  <div class="relative h-full w-full">
    <div class="absolute left-1/2 top-6 -translate-x-1/2">
      <img
        src="../assets/svg/banner-text.svg"
        alt="banner-text"
        class="animate__animated"
        :class="[animatedOut ? 'animate__bounceOutUp' : 'animate__bounceInDown']"
      />
    </div>

    <div class="absolute left-1/2 top-1/2 -translate-x-1/2">
      <div
        class="animate__bounceInRight animate__animated"
        :class="[animatedOut ? 'animate__bounceOutLeft' : 'animate__bounceInRight']"
      >
        <a-button
          :loading="isLoading"
          type="default"
          class="btn-primary shadow-[3px_4px_0px_0_#000]"
          @click="onClickReady"
        >
          Let's go !
        </a-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
