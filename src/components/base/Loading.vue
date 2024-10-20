<script lang="ts" setup>
  withDefaults(
    defineProps<{
      size?: number
      color?: string
      backgroundColor?: string
      fullScreen?: boolean
    }>(),
    {
      size: 128,
      color: '#33B44F',
      backgroundColor: 'transparent',
      fullScreen: false
    }
  )
</script>

<template>
  <div class="loading-container" :class="[fullScreen && 'fullscreen']">
    <div class="flex">
      <svg
        viewBox="0 0 38 38"
        xmlns="http://www.w3.org/2000/svg"
        :width="`${size}`"
        :height="`${size}`"
        :stroke="color"
      >
        <g fill="none" fill-rule="evenodd">
          <g transform="translate(1 1)" stroke-width="2">
            <circle stroke-opacity=".25" cx="18" cy="18" r="18"></circle>
            <path d="M36 18c0-9.94-8.06-18-18-18">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 18 18"
                to="360 18 18"
                dur="0.8s"
                repeatCount="indefinite"
              ></animateTransform>
            </path>
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;

    &.fullscreen {
      --fullscreen-background-color: v-bind(backgroundColor);

      position: fixed;
      inset: 0;
      z-index: 9999;
      background-color: var(--fullscreen-background-color, rgba(0, 0, 0, 0.5));
    }
  }
</style>
