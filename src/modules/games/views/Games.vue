<script lang="ts" setup>
  const games = ref([])
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between">
    <NetworkBadge />
    <MainHeader />
    <div class="flex-grow-1 mt-4 flex flex-col overflow-y-hidden px-4">
      <div class="">
        <span class="font-600 text-secondary text-lg">Suggested for you</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
