<script lang="ts" setup>
  const props = defineProps<{
    status: 'win' | 'lose' | 'draw' | ''
  }>()

  const showModal = defineModel('open', { type: Boolean })

  const emits = defineEmits<{
    continue: []
  }>()
</script>

<template>
  <a-modal v-model:open="showModal" title="Result">
    <template #footer>
      <a-button key="submit" type="primary" @click="emits('continue')"> Chơi lại </a-button>
    </template>
    <div v-if="props.status === 'win'">
      <p>Thắng rồi đại vương ơi !</p>
    </div>
    <div v-else-if="props.status === 'lose'">
      <p>Thua mất rồi đại vương ơi !</p>
    </div>
    <div v-else>
      <p>Hòa rồi đại vương ơi !</p>
    </div>
  </a-modal>
</template>

<style lang="scss" scoped></style>
