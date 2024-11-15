<script lang="ts" setup>
  import SelectionScreen from '../components/SelectionScreen.vue'
  import type { UtxoObject } from '../interfaces'
  import { useRpsStore } from '../stores/rpsStore'

  const rpsStore = useRpsStore()

  const route = useRoute()
  const nodeId = ref(route.query.node as string)

  const utxo = ref<UtxoObject>({
    'b79aa9deb5d8aac845fdcea12a6ad175e5393e7a15fdc0a27604f0e7d384e318#1': {
      address:
        'addr_test1qqexe44l7cg5cng5a0erskyr4tzrcnnygahx53e3f7djqqmzfyq4rc0xr8q3fch3rlh5287uxrn4yduwzequayz94yuscwz6j0',
      datum: null,
      datumhash: null,
      inlineDatum: null,
      referenceScript: null,
      value: {
        lovelace: 4822707
      }
    }
  })

  onMounted(() => {
    rpsStore.initConnection(nodeId.value)
  })

  onBeforeUnmount(() => {
    rpsStore.closeConnection()
  })
</script>

<template>
  <div class="p-4">
    <SelectionScreen />
  </div>
</template>

<style lang="scss" scoped></style>
