<script lang="ts" setup>
  import { formatId } from '@/utils/format'
  import { networkInfo } from '@/constants/chain'
  import BigNumber from 'bignumber.js'
  import type { TxHash, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'

  type PropType = {
    listUtxo: { txId: string; txIndex: number; utxo: UTxOObjectValue }[]
  }

  const props = defineProps<PropType>()

  const emits = defineEmits<{
    select: [value: TxHash[]]
    refresh: []
  }>()

  const showModal = ref(false)

  const handleOk = () => {
    //
    emits('select', selected.value)
    showModal.value = false
  }

  // const selected = ref(props.listUtxo[0])
  const options = computed(() => {
    return props.listUtxo.map(item => ({
      label: `${formatId(item.txId, 7, 7)}#${item.txIndex}`,
      value: `${item.txId}#${item.txIndex}` as TxHash,
      utxo: item.utxo
    }))
  })
  const selected = ref<(typeof options.value)[number]['value'][]>([])

  const checkIncludeAsset = (value: UTxOObjectValue['value']) => {
    const keys = Object.keys(value)
    return keys.length > 1 || (keys.length === 1 && keys[0] !== 'lovelace')
  }
</script>

<template>
  <div>
    <a-modal v-model:open="showModal" title="Basic Modal" @ok="handleOk" width="680px">
      <a-button type="primary" @click="emits('refresh')" class="mb-2" size="small">Refresh</a-button>

      <a-checkbox-group v-model:value="selected">
        <a-checkbox
          :style="{
            display: 'flex',
            height: '24px',
            lineHeight: '24px'
          }"
          :value="item.value"
          v-for="item in options"
          :key="item.label"
        >
          <div class="flex items-center">
            <div class="w-180px flex">{{ formatId(item.value, 7, 7) }}</div>
            <div class="w-180px flex">
              {{
                BigNumber(item.utxo.value.lovelace)
                  .div(10 ** networkInfo.decimals)
                  .toFormat()
              }}
              {{ networkInfo.symbol }}
            </div>
            <div class="w-180px flex">
              {{ checkIncludeAsset(item.utxo.value) ? 'Include Assets' : '' }}
            </div>
          </div>
        </a-checkbox>
      </a-checkbox-group>
    </a-modal>
    <slot name="reference">
      <a-button type="primary" @click="showModal = true">Select UTXO</a-button>
    </slot>
  </div>
</template>

<style scoped>
  /* Your component's CSS styles go here */
</style>
