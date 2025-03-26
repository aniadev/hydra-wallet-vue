<script lang="ts" setup>
  import AssetEntity from '../AssetEntity.vue'

  const props = withDefaults(
    defineProps<{
      type: 'ROCK' | 'PAPER' | 'SCISSORS'
      active?: boolean
      disabled?: boolean
    }>(),
    {
      active: false,
      disabled: false
    }
  )

  const text = computed(() => {
    switch (props.type) {
      case 'ROCK':
        return 'Rock'
      case 'PAPER':
        return 'Paper'
      case 'SCISSORS':
        return 'Scissors'
    }
  })

  const entityName = computed(() => {
    switch (props.type) {
      case 'ROCK':
        return 'CHOICE_ROCK'
      case 'PAPER':
        return 'CHOICE_PAPER'
      case 'SCISSORS':
        return 'CHOICE_SCISSORS'
    }
  })
</script>

<template>
  <div class="choice" :class="{ active, disabled }" hover="cursor-pointer">
    <div class="absolute left-0 top-0 flex h-full w-full select-none flex-col items-center justify-center">
      <AssetEntity :asset="entityName" />
      <div class="text-gray-9 mt-1 text-sm">{{ text }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .choice {
    transition: all 0.1s ease-out;
    @apply pb-full rounded-3 relative w-full border-2 border-solid border-[#EBEBEB] bg-white;

    &.active {
      @apply border-primary scale-110;
    }
    &.disabled {
      @apply op-70 pointer-events-none cursor-not-allowed;
    }
  }
</style>
