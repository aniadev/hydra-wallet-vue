<script lang="ts" setup>
  import type { Bip32PrivateKey } from '@emurgo/cardano-serialization-lib-browser'
  import Authentication from '../components/playground/Authentication.vue'
  import { GameInteraction } from '../resources/rps-interaction'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { networkInfo } from '@/constants/chain'

  const gameFrame = ref<HTMLIFrameElement | null>(null)
  function onGameLoaded(e: any) {
    console.log('Game loaded', e)
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  function handleMessage(event: any) {
    if (!event.source.CocosEngine) return
    console.log('>>> / event from game:', event)
    if (event.data.type === 'status' && event.data.data === 'loaded') {
      console.log('Game loaded')
      const lobbyInteraction = (gameFrame.value?.contentWindow as any).lobby
      const playerInteraction = (gameFrame.value?.contentWindow as any).player
      console.log('>>> / lobby:', lobbyInteraction)
      console.log('>>> / player:', playerInteraction)
      playerInteraction.setUserInfo({
        username: 'Ania9 Vtc',
        walletAddress: 'addr_t...ab1',
        coin: 130,
        coinSymbol: 'tADA',
        avatar: 'https://i.imgur.com/74W9HOS.jpeg'
      })
    }
  }

  //
  const auth = useAuthV2()
  const _rootKey = ref<Bip32PrivateKey | null>(null)
  const address = ref('')
  const gamePassword = ref('Password@123')

  const onAuth = (rootKey: typeof auth.rootKey) => {
    _rootKey.value = rootKey
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      return
    }

    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })

    console.log('Enterprise Address: ', wallet.getEnterpriseAddress())
    console.log('Payment Address: ', wallet.getPaymentAddress())
    console.log('Used Address: ', wallet.getUsedAddress())

    // test
    const paymentKey = useWalletCore().getSigningKey(rootKey)
    const publicKey = useWalletCore().getVerificationKey(paymentKey)
    console.log('paymentKey: ', paymentKey.toJSON())
    console.log('publicKey: ', publicKey.toJSON())

    console.log('Xpriv', rootKey.to_bech32())
    console.log('Xpub', rootKey.to_public().to_bech32())
    console.log('Signer Hash', wallet.getAccount(0, 0).paymentKey.toPublic().hash().hex())

    address.value = wallet.getUsedAddress().toBech32()
  }

  const onRemoveAuth = () => {
    _rootKey.value = null
  }

  const onLoginToGame = () => {
    if (!address.value) return
    if (!gameFrame.value) return
    // const playerInteraction = (gameFrame.value?.contentWindow as any).player
    // playerInteraction.login(address.value, gamePassword.value)
  }
</script>

<template>
  <a-row :gutter="12">
    <a-col :span="8">
      <div class="p-4">
        <Authentication @auth="onAuth" @remove-auth="onRemoveAuth" />
        <div class="mt-4">
          <p class="break-anywhere">Address: {{ address }}</p>

          <a-input v-model:value="address" readonly placeholder="Wallet address" />
          <a-input v-model:value="gamePassword" placeholder="Game password" class="mt-2" />
          <a-button class="mt-2" type="primary" @click="onLoginToGame">Login to game</a-button>
        </div>
      </div>
    </a-col>
    <a-col :span="16" class="mt-4">
      <!-- <iframe
        ref="gameFrame"
        src="/games/rock-paper-scissors/index.html"
        frameborder="0"
        class="game-frame"
        title="Rock Paper Scissors Game"
        width="850"
        height="500"
        :onload="onGameLoaded"
      ></iframe> -->
      <iframe
        ref="gameFrame"
        src="http://localhost:7457"
        frameborder="0"
        class="game-frame"
        title="Rock Paper Scissors Game"
        width="1280"
        height="960"
        :onload="onGameLoaded"
      ></iframe>
    </a-col>
  </a-row>
</template>

<style lang="scss" scoped></style>
