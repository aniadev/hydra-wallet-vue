<script lang="ts" setup>
  import type { Bip32PrivateKey } from '@emurgo/cardano-serialization-lib-browser'
  import Authentication from '../components/playground/Authentication.vue'
  import { GameInteraction } from '../resources/rps-interaction'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { networkInfo } from '@/constants/chain'

  import { useRpsStoreV2 } from '../rps-v2/store/index'
  import { useGameStore } from '../stores/gameStore'
  import { storeToRefs } from 'pinia'
  import { io } from 'socket.io-client'
  import { SOCKET_EVENT } from '../rps-v2/constants'
  import { formatId } from '@/utils/format'
  import { message } from 'ant-design-vue'
  import { buildResponseMessage, GameApiNsp } from '../rps-v2/utils/game-api'

  const gameFrame = ref<HTMLIFrameElement | null>(null)
  const gameStore = useGameStore()

  function onGameLoaded(e: any) {
    console.log('Game loaded', e)
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  async function handleMessage(event: MessageEvent<any>) {
    const { data } = event
    if (!data || data.protocol !== 'game-api' || data.type !== 'request') return
    console.log('>>> / event from game:', event)

    if (data.payload?.fncName === 'fetchAuthorization') {
      const args = data.payload?.args

      // call api to fetch lobby list
      // then return the data to game
      const accessToken = gameStore.gameAccessToken
      const result = {
        accessToken,
        walletAddress: gameStore.gameAccount?.walletAddress
      }
      const response = buildResponseMessage(data.payload.fncName, result)
      // window.postMessage(response, '*')
      gameFrame.value?.contentWindow?.postMessage(response, '*')
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
  }

  // // Game state
  // const gameStore = useGameStore()
  // const rpsStore = useRpsStoreV2()
  // const gameWsUrl = import.meta.env.VITE_APP_HYDRA_GAME_WS_ENDPOINT as string
  // const gameSocket = reactive(
  //   io(`${gameWsUrl}/game`, {
  //     transports: ['websocket', 'polling'],
  //     auth: {
  //       token: `${useLocalStorage('token', '').value}`
  //     },
  //     autoConnect: false
  //   })
  // )

  // const { rooms } = storeToRefs(rpsStore)
  // rpsStore.fetchRooms()

  // // TEST ================================================================================
  // const onlineUsers = ref<any[]>([])
  // // TEST ================================================================================

  // onMounted(() => {
  //   gameSocket.connect()
  //   gameSocket.on(SOCKET_EVENT.CONNECTED, () => {
  //     console.log('Connected to game server')
  //   })
  //   gameSocket.on(SOCKET_EVENT.DISCONNECTED, () => {
  //     console.log('Disconnected from game server')
  //   })
  //   gameSocket.on(SOCKET_EVENT.ONLINE_USERS, (payload: any) => {
  //     console.log('ONLINE_USERS', payload)
  //     onlineUsers.value = payload
  //   })
  //   gameSocket.on(SOCKET_EVENT.ROOM_ACTION, (payload: any) => {
  //     console.log('ROOM_ACTION', payload)
  //   })
  //   gameSocket.on(SOCKET_EVENT.MESSAGE, (payload: any) => {
  //     if (payload === 'ANOTHER_SESSION_LOGIN') {
  //       message.error('Another session is logged in, please login again')
  //       return
  //     }
  //   })
  // })

  // onBeforeUnmount(() => {
  //   gameSocket.disconnect()
  // })
</script>

<template>
  <a-row :gutter="12">
    <!-- <a-col :span="8">
      <div class="">
        <div class="px-1">
          <p class="">Online users: {{ onlineUsers.length }}</p>
          <ul class="list-circle m-0 flex flex-col p-0">
            <li class="flex items-center justify-between" v-for="user in onlineUsers" :key="user.id">
              <span class="">{{ user.alias }}</span>
              <span class="text-xs">{{ formatId(user.walletAddress, 8, 4) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </a-col> -->
    <a-col :span="24" class="mt-4" align="center">
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
        contenteditable="true"
        :onload="onGameLoaded"
      ></iframe>
    </a-col>
  </a-row>
</template>

<style lang="scss" scoped></style>
