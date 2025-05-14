<script lang="ts" setup>
  const open = defineModel('open', { type: Boolean, default: false })

  const props = defineProps<{
    data: Array<{
      tag: string
      json: string
      timestamp: number | string
      seq: number | ''
    }>
  }>()
</script>

<template>
  <div class="z-1000 fixed right-6 top-4">
    <a-button @click="open = true" size="small" type="default"> Debug </a-button>
  </div>
  <a-drawer
    v-model:open="open"
    class="custom-class"
    root-class-name="root-class-name"
    :root-style="{ color: 'blue' }"
    style="color: red"
    title="Debugger"
    placement="right"
  >
    <a-collapse>
      <a-collapse-panel v-for="(item, i) in props.data" :key="i">
        <template #header>
          <div class="flex items-center justify-between">
            <span>{{ item.tag }} ({{ item.seq }})</span>
            <span class="text-sm">{{ useDateFormat(item.timestamp, 'hh:mm:ss').value }}</span>
          </div>
        </template>
        <highlightjs language="js" class="text-10px w-full" :code="item.json" />
      </a-collapse-panel>
    </a-collapse>
  </a-drawer>
</template>

<style lang="scss" scoped></style>
