<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { useRpsStore } from '../../stores/rpsStore'
  import { message } from 'ant-design-vue'
  import type { TxHash } from '@/lib/hydra-bridge/types/utxo.type'
  import { snapshotUtxoToArray } from '@/lib/hydra-bridge/utils/builder'
  import { AssetId } from '@/lib/types'

  const rpsStore = useRpsStore()
  // const { hydraBridge } = storeToRefs(rpsStore)
  // Logic for decommit
  const decommitUtxo = ref(``)
  const decommitCborHexSigned = ref('')
  const decommitTxHash = ref('')
  const buildTxDecommit = async () => {
    const hydraBridge = rpsStore.getBridge()
    let utxos = null
    try {
      utxos = JSON.parse(decommitUtxo.value)
    } catch {
      message.error('Invalid JSON format')
      return
    }
    console.log(utxos)

    const txHashes = Object.keys(utxos) as TxHash[]
    const totalLovelace = txHashes.reduce((acc, txHash) => {
      const utxo = utxos[txHash]
      return acc + utxo.value.lovelace
    }, 0)
    const toAddress = utxos[txHashes[0]].address
    console.log('totalLovelace', totalLovelace)

    const txBuilder = await hydraBridge.getTxBuilder()

    const inputUTxOs = snapshotUtxoToArray(utxos)
    inputUTxOs.forEach(utxo => {
      console.log('utxo', utxo.input().toCore(), utxo.output().toCore())
      const txInput = CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.input().transactionId(), 'hex')),
        Number(utxo.input().index())
      )
      const address = CardanoWasm.Address.from_bech32(utxo.output().address().toBech32().toString())
      // const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(`${utxo.output().amount().coin().toString()}`))
      const coin = CardanoWasm.BigNum.from_str(`${utxo.output().amount().coin().toString()}`)

      let inputValue = CardanoWasm.Value.zero()
      const outputMultiasset = utxo.output().amount().multiasset()
      if (outputMultiasset) {
        // TODO: Cập nhật lại logic, đang bị chồng chéo cardano-sdk và cardano-serialization-lib
        const multiAsset = CardanoWasm.MultiAsset.new()
        outputMultiasset.forEach((value, assetId) => {
          const policyId = AssetId.getPolicyId(assetId).toString()
          const assetName = AssetId.getAssetName(assetId).toString()
          const quantity = value.toString()

          const assets = CardanoWasm.Assets.new()
          assets.insert(CardanoWasm.AssetName.new(Buffer.from(assetName, 'hex')), CardanoWasm.BigNum.from_str(quantity))
          multiAsset.insert(CardanoWasm.ScriptHash.from_hex(policyId), assets)
        })
        inputValue = CardanoWasm.Value.new_with_assets(coin, multiAsset)
      } else {
        inputValue = CardanoWasm.Value.new(coin)
      }
      txBuilder.add_regular_input(address, txInput, inputValue)
    })

    const inputs = CardanoWasm.TransactionUnspentOutputs.new()

    txBuilder.set_fee(CardanoWasm.BigNum.from_str('0'))

    // add output
    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(toAddress)
    const txOutput2 = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('1000000'))
    )
    // txBuilder.add_output(txOutput2)

    const shelleyChangeAddress = CardanoWasm.Address.from_bech32(toAddress)
    txBuilder.add_change_if_needed(shelleyChangeAddress)

    const txBody = txBuilder.build()
    const getTxHash = (txBody: any) => {
      const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
      return tx.transaction_hash()
    }
    const txHash = getTxHash(txBody)
    const tx = CardanoWasm.Transaction.new(txBody, CardanoWasm.TransactionWitnessSet.new())
    console.log('tx', tx.to_js_value(), tx.to_hex())
    decommitTxHash.value = txHash.to_hex()
  }

  const decommitTx = async () => {
    const hydraBridge = rpsStore.getBridge()
    if (!decommitCborHexSigned.value || !decommitTxHash.value) {
      message.error('Sign tx first')
      return
    }
    const rs = await hydraBridge.commands.decommit({
      cborHex: decommitCborHexSigned.value,
      txHash: decommitTxHash.value
    })
    console.log('txHash', rs)
  }
</script>

<template>
  <div class="">
    <p class="">Decommit funds</p>
    <div class="flex flex-col gap-3">
      <a-textarea v-model:value="decommitUtxo" placeholder="Decommit UTxO" :rows="4" allow-clear />
      <a-button @click="buildTxDecommit()" size="small">Build tx and sign</a-button>
    </div>
    <p class="!m-0">Signed CBOR:</p>
    <div class="flex flex-col gap-3">
      <a-textarea v-model:value="decommitCborHexSigned" placeholder="Decommit Tx Cbor" :rows="4" allow-clear />
      <a-button @click="decommitTx()" size="small">Decommit Tx</a-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
