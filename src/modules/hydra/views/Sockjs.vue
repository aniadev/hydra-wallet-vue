<script lang="ts" setup>
  import { client } from 'stompjs'

  onMounted(() => {
    // Stombjs
    const hydraClient = client('ws://172.168.11.227:8069/hydra')

    hydraClient.ws.onopen = () => {
      console.log('open')
      hydraClient.subscribe('/topic/messages', message => {
        console.log(message)
      })

      hydraClient.send('/app/send', { 'content-type': 'application/json' }, JSON.stringify({ name: 'hydra' }))
      hydraClient.send(
        '/topic/messages',
        { 'content-type': 'application/json' },
        JSON.stringify({ name: 'topic/messages' })
      )
    }

    hydraClient.ws.onmessage = e => {
      console.log(e, hydraClient.heartbeat)
    }
  })

  const message = ref('')
</script>

<template>
  <div class="">
    <a-form size="small">
      <a-form-item class="!mb-1" label="Mnemonic">
        <a-textarea v-model:value="message" />
      </a-form-item>
      <!-- <a-form-item class="!mb-1" label="Base address (bech_32)">
          <a-textarea :value="fromAccount.baseAddressStr" />
        </a-form-item> -->
    </a-form>
  </div>
</template>

<style lang="scss" scoped></style>
