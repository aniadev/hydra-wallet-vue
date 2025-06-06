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
  import type { TxHash, UTxOObject, UTxOObjectValue } from '@/lib/hydra-bridge/types/utxo.type'

  const rpsStore = useRpsStore()
  const { hydraBridge } = storeToRefs(rpsStore)

  const formSendToken = reactive({
    policyId: '0836587ed7cee3c0790e24c930c67f31fc2511a3c25aa66ed205e05f',
    assetName: '74525053',
    quantity: '1',
    toAddress: ''
  })

  const assetName = computed(() => {
    return Buffer.from(formSendToken.assetName, 'hex').toString('utf-8')
  })

  onMounted(async () => {
    const wallet = getWallet()
    const fromAddress = wallet.getAccount().baseAddress.toBech32()
    console.log('fromAddress', fromAddress)
    formSendToken.toAddress = fromAddress
  })

  const isLoading = ref(false)
  async function sendToken() {
    if (!hydraBridge.value) {
      console.error('HydraBridge is not initialized')
      return
    }
    try {
      isLoading.value = true

      const wallet = getWallet()
      const myAddress = wallet.getAccount().baseAddress.toBech32()
      const bridge = hydraBridge.value
      const snapshotUtxo = (await bridge.querySnapshotUtxo()) || {}
      const myUtxos = Object.keys(snapshotUtxo)
        .filter(txHash => {
          const utxo = snapshotUtxo[txHash as TxHash]
          return utxo.address === myAddress
        })
        .map(txHash => ({
          ...snapshotUtxo[txHash as TxHash],
          txId: txHash.split('#')[0],
          txIndex: Number(txHash.split('#')[1])
        }))
      console.log('myUtxos', myUtxos)
      const txBuilder = await bridge.getTxBuilder()

      const inputs = CardanoWasm.TransactionUnspentOutputs.new()
      myUtxos.forEach(utxo => {
        const txInput = CardanoWasm.TransactionInput.new(CardanoWasm.TransactionHash.from_hex(utxo.txId), utxo.txIndex)
        const address = CardanoWasm.Address.from_bech32(utxo.address)

        console.log('txInput', txInput.to_js_value())
        let inputValue = CardanoWasm.Value.zero()
        const inputWithAsset = Object.keys(utxo.value).length > 1
        if (inputWithAsset) {
          const assetPolicies = Object.keys(utxo.value)
            .filter(policyId => policyId !== 'lovelace')
            .map(policyId => {
              const asset = utxo.value[policyId] as Record<string, number>
              return {
                policyId,
                assets: Object.keys(asset).map(assetName => ({
                  assetName,
                  quantity: asset[assetName]
                }))
              }
            })
          const multiAsset = CardanoWasm.MultiAsset.new()
          for (const assetPolicy of assetPolicies) {
            const assets = CardanoWasm.Assets.new()
            for (const asset of assetPolicy.assets) {
              const inputQuantity = asset.quantity
              console.log('>>> / inputQuantity:', inputQuantity)

              const assetName = CardanoWasm.AssetName.new(Buffer.from(asset.assetName, 'hex'))
              const policyId = CardanoWasm.ScriptHash.from_hex(assetPolicy.policyId)
              assets.insert(assetName, CardanoWasm.BigNum.from_str(`${inputQuantity}`))

              multiAsset.insert(policyId, assets)
            }
          }
          inputValue = CardanoWasm.Value.new_with_assets(
            CardanoWasm.BigNum.from_str(`${utxo.value.lovelace}`),
            multiAsset
          )
        } else {
          inputValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(`${utxo.value.lovelace}`))
        }

        // const utxoInput = CardanoWasm.TransactionUnspentOutput.new(
        //   txInput,
        //   CardanoWasm.TransactionOutput.new(address, inputValue)
        // )

        txBuilder.add_regular_input(address, txInput, inputValue)
      })
      console.log('txInput: after', inputs.to_js_value())

      txBuilder.set_fee(CardanoWasm.BigNum.from_str('0'))

      // add output
      const shelleyOutputAddress = CardanoWasm.Address.from_bech32(myAddress)

      // Build asset amount out
      console.log('formSendToken', formSendToken)
      const assetName = CardanoWasm.AssetName.new(Buffer.from(formSendToken.assetName, 'hex'))
      const policyId = CardanoWasm.ScriptHash.from_hex(formSendToken.policyId)
      const assets = CardanoWasm.Assets.new()
      assets.insert(assetName, CardanoWasm.BigNum.from_str(`${formSendToken.quantity}`))
      const multiAsset = CardanoWasm.MultiAsset.new()
      multiAsset.insert(policyId, assets)

      const placeholderAmountOut = CardanoWasm.Value.new_with_assets(CardanoWasm.BigNum.from_str('0'), multiAsset)
      const placeholderOutput = CardanoWasm.TransactionOutput.new(shelleyOutputAddress, placeholderAmountOut)

      const dataCost = CardanoWasm.DataCost.new_coins_per_byte(CardanoWasm.BigNum.from_str('4310'))
      const minAda = CardanoWasm.min_ada_for_output(placeholderOutput, dataCost)
      const txOutput1 = CardanoWasm.TransactionOutput.new(
        shelleyOutputAddress,
        CardanoWasm.Value.new_with_assets(minAda, multiAsset)
      )
      console.log('>>> / minAda:', minAda.to_str())

      const txOutput2 = CardanoWasm.TransactionOutput.new(
        shelleyOutputAddress,
        CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('3000000'))
      )
      txBuilder.add_output(txOutput1)
      txBuilder.add_output(txOutput2)
      const shelleyChangeAddress = CardanoWasm.Address.from_bech32(myAddress)
      txBuilder.add_change_if_needed(shelleyChangeAddress)

      const txBody = txBuilder.build()

      const tx = CardanoWasm.Transaction.new(txBody, CardanoWasm.TransactionWitnessSet.new())
      console.log('tx', tx.to_js_value(), tx.to_hex())
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
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
  <div class="flex flex-col gap-2">
    <a-input v-model:value="formSendToken.policyId" addon-before="Policy ID" placeholder="To address"></a-input>
    <a-input v-model:value="formSendToken.toAddress" addon-before="To Addr" placeholder="To address"></a-input>
    <div class="flex w-full items-center gap-2">
      <a-input-number
        v-model:value="formSendToken.quantity"
        class="flex-grow-1"
        :addon-before="assetName"
        :min="0"
        decimalSeparator="."
        :formatter="formatter"
        :parser="parser"
        :controls="false"
      />
      <a-button @click="sendToken()" type="primary" :loading="isLoading">Send token</a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
