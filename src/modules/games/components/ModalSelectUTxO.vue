<script lang="ts" setup>
  import { formatId } from '@/utils/format'
  import type { UtxoObjectValue } from '../interfaces'
  import { networkInfo } from '@/constants/chain'
  import BigNumber from 'bignumber.js'

  type PropType = {
    listUtxo: { txId: string; txIndex: number; utxo: UtxoObjectValue }[]
  }

  const props = defineProps<PropType>()

  const emits = defineEmits<{
    select: [value: PropType['listUtxo'][number]]
  }>()

  const showModal = ref(false)

  const handleOk = () => {
    //
    emits('select', selected.value)
    showModal.value = false
  }

  const selected = ref(props.listUtxo[0])
</script>

<template>
  <div>
    <a-modal v-model:open="showModal" title="Basic Modal" @ok="handleOk">
      <a-radio-group v-model:value="selected">
        <a-radio
          :style="{
            display: 'flex',
            height: '24px',
            lineHeight: '24px'
          }"
          :value="item"
          v-for="item in props.listUtxo"
          :key="item.txId"
        >
          <div class="flex items-center">
            <div class="w-180px flex">{{ formatId(item.txId, 7, 7) }}#{{ item.txIndex }}</div>
            <div class="">
              {{
                BigNumber(item.utxo.value.lovelace)
                  .div(10 ** networkInfo.decimals)
                  .toFormat()
              }}
              {{ networkInfo.symbol }}
            </div>
          </div>
        </a-radio>
      </a-radio-group>
    </a-modal>
    <slot name="reference">
      <a-button type="primary" @click="showModal = true">Select UTXO</a-button>
    </slot>
  </div>
</template>

<style scoped>
  /* Your component's CSS styles go here */
</style>
