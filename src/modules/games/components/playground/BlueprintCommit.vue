<script lang="ts" setup>
  import type { BlueprintCommitBody } from '@/lib/hydra-bridge/types/commit.type'
  import { useRpsStore } from '../../stores/_rpsStore_bkup'
  import { storeToRefs } from 'pinia'
  import { AppWallet } from '@/lib/hydra-wallet'
  import { networkInfo } from '@/constants/chain'
  import type { ProtocolParameters } from '@/lib/hydra-bridge/types/protocol-parameters.type'
  import axios from 'axios'
  import { message } from 'ant-design-vue'
  import { getTxBuilder } from '@/lib/hydra-bridge/utils/transaction'
  import type { UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'

  const rpsStore = useRpsStore()
  const { hydraBridge } = storeToRefs(rpsStore)

  const props = defineProps<{
    listUtxo: { txId: string; txIndex: number; utxo: UTxOObjectValue }[]
  }>()
  const lovelace = ref('1000000')
  const cardanoProtocolParameters = ref<ProtocolParameters | null>(null)

  onMounted(async () => {
    try {
      // get layer 1 pp:
      const rs = await axios({
        method: 'GET',
        url: 'https://hexcore.io.vn/hydra-main/node-info'
      })
      if (!rs.data?.data?.protocolParameters) {
        throw 'Failed to get protocol parameters'
      }
      cardanoProtocolParameters.value = rs.data?.data?.protocolParameters
    } catch {
      message.error('Failed to get protocol parameters')
    }
  })

  async function blueprintCommit() {
    if (!hydraBridge.value) {
      console.error('HydraBridge is not initialized')
      return
    }
    if (!cardanoProtocolParameters.value) {
      console.error('Failed to get protocol parameters')
      return
    }
    if (!props.listUtxo.length) {
      message.error('No utxo inputs')
      return
    }

    const _lovelace = lovelace.value.replace(/[^0-9]/g, '')

    const wallet = getWallet()

    const fromAddress = wallet.getAccount().baseAddress.toBech32()
    console.log('fromAddress', fromAddress)
    const txBuilder = getTxBuilder(cardanoProtocolParameters.value)

    // NOTE: Chỉ lấy các UTxO nào không chứa datum và assets
    const validInputUtxos = props.listUtxo.filter(utxo => {
      const value = utxo.utxo.value
      const keys = Object.keys(value)
      return keys.length === 1 && keys[0] === 'lovelace' && !utxo.utxo.inlineDatum && !utxo.utxo.datumhash
    })
    console.log('validInputUtxos', validInputUtxos)
    validInputUtxos.forEach(utxo => {
      const txInput = CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.txId, 'hex')),
        utxo.txIndex
      )
      const address = CardanoWasm.Address.from_bech32(utxo.utxo.address)
      const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(`${utxo.utxo.value.lovelace}`))
      txBuilder.add_regular_input(address, txInput, value)
    })

    // add output
    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(fromAddress)
    const amountSend = _lovelace
    const txOutput1 = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountSend))
    )
    txBuilder.add_output(txOutput1)
    const shelleyChangeAddress = CardanoWasm.Address.from_bech32(fromAddress)
    txBuilder.add_change_if_needed(shelleyChangeAddress)

    txBuilder.set_fee(CardanoWasm.BigNum.zero())

    const txBody = txBuilder.build()
    const getTxBodyHash = (txBody: any) => {
      const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
      return tx.transaction_hash()
    }
    const txBodyHash = getTxBodyHash(txBody)
    const witnessSet = CardanoWasm.TransactionWitnessSet.new()
    const tx = CardanoWasm.Transaction.new(txBody, witnessSet, undefined)

    console.log('txHash', txBodyHash.to_hex())
    console.log('txCbor', tx.to_hex())
    console.log('Tx: ', tx.to_js_value())

    const commitUtxos = validInputUtxos.reduce((acc, item) => {
      if (!item.utxo) return acc
      acc[`${item.txId}#${item.txIndex}`] = item.utxo
      return acc
    }, {} as UTxOObject)
    const body: BlueprintCommitBody = {
      blueprintTx: {
        cborHex: tx.to_hex(),
        description: '',
        txId: txBodyHash.to_hex(),
        type: 'Unwitnessed Tx ConwayEra'
      },
      utxo: commitUtxos
    }
    console.log('body', body)
    const unsignedTx = await hydraBridge.value.commit(body)
    if (!unsignedTx) return
    console.log('unsignedTx', unsignedTx)
    const signedCborHex = await wallet.signTx(unsignedTx.cborHex, true, 0, 0)
    console.log('signedCborHex', signedCborHex)
    const rs = await hydraBridge.value?.submitCardanoTransaction({
      ...unsignedTx,
      cborHex: signedCborHex
    })
    console.log('>>> / rs:', rs)
    if (rs) {
      message.success('Submited tx to Layer 1')
    }
  }

  const auth = useAuthV2()
  const getPrivateSigningKey = () => {
    const rootKey = auth.rootKey
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      throw new Error('Root key is not found')
    }
    const privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
      .derive(1852 | 0x80000000)
      .derive(1815 | 0x80000000)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // 0
      .derive(0) // key index: 0
      .to_raw_key()
    return privateSigningKey
  }

  const getWallet = () => {
    const rootKey = auth.rootKey
    if (!rootKey) {
      console.log('ERROR: rootKey is not found')
      throw new Error('Root key is not found')
    }
    const wallet = new AppWallet({
      networkId: networkInfo.networkId,
      key: {
        type: 'root',
        bech32: rootKey.to_bech32()
      }
    })
    return wallet
  }

  const formatter = (value: number | string) => {
    return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
  }

  const parser = (value: string) => {
    return value.replace(/\s/g, '')
  }
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <a-input-number
      v-model:value="lovelace"
      class="flex-grow-1"
      addon-before="Lovelace:"
      :min="0"
      decimalSeparator="."
      :formatter="formatter"
      :parser="parser"
      :controls="false"
    />
    <a-button @click="blueprintCommit()" type="primary">Blueprint Commit</a-button>
  </div>
</template>

<style lang="scss" scoped></style>
