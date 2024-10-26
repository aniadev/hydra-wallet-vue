<script lang="ts" setup>
  const props = defineProps<{
    imageHash?: string | null
  }>()
  const imageUrl = ref('')
  const ipfs = useIpfs()
  const loadingUrl = ref(false)

  watch(
    () => props.imageHash,
    () => fetchImageData
  )
  fetchImageData()

  function fetchImageData() {
    if (!props.imageHash) {
      console.warn('Image hash is not provided')
      imageUrl.value = '/images/wallet-logo.png'
      return
    }
    loadingUrl.value = true
    ipfs
      .fetchImage(props.imageHash)
      .then(url => {
        imageUrl.value = url
      })
      .catch(error => {
        console.error(error)
      })
      .finally(() => {
        loadingUrl.value = false
      })
  }
</script>

<template>
  <loading v-if="loadingUrl" :size="12" />
  <img :src="imageUrl" alt="icon" v-else />
</template>

<style lang="scss" scoped></style>
