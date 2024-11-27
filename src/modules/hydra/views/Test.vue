<script lang="ts" setup>
  import type {
    BaseAddress,
    Bip32PrivateKey,
    Bip32PublicKey,
    PrivateKey
  } from '@emurgo/cardano-serialization-lib-browser'

  import hljs from 'highlight.js/lib/core'
  import javascript from 'highlight.js/lib/languages/javascript'
  import 'highlight.js/styles/monokai-sublime.min.css'

  // Then register the languages you need
  hljs.registerLanguage('javascript', javascript)

  const fromAccount = reactive({
    mnemonic: 'enable away depend exist mad february table onion census praise spawn pipe again angle grant',
    rootkey: null as Bip32PrivateKey | null,
    baseAddress: null as BaseAddress | null,
    accountKey: null as Bip32PrivateKey | null,
    pubKey: null as Bip32PublicKey | null,
    prvKey: null as PrivateKey | null,
    rootkeyStr: '',
    baseAddressStr: '',
    accountKeyStr: '',
    pubKeyStr: '',
    prvKeyStr: ''
  })

  const toAddress = ref(
    'addr_test1qpfapec2gwusjg3cqhhp8apry5kzh95tq2q7cdtepe5k7v38g96gcuuu7scm4jzaafda27qx7pes2eyvg8e8kpgm353swpqeyn'
  )
  const amount = ref('5')
  const result = ref({})

  const walletCore = useWalletCore()
  onMounted(() => {
    const rootkey = walletCore.getRootKeyByMnemonic(fromAccount.mnemonic)
    fromAccount.rootkey = rootkey
    fromAccount.rootkeyStr = rootkey.to_bech32()
    fromAccount.baseAddress = walletCore.getBaseAddressFromMnemonic(fromAccount.mnemonic)
    fromAccount.baseAddressStr = fromAccount.baseAddress.to_address().to_bech32()
    const accountKey = rootkey
      .derive(1852 | 0x80000000) // Purpose: 1852'
      .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // External chain: 0
      .derive(0) // Address index: 0
    const publicKey = accountKey.to_public()
    const network = CardanoWasm.NetworkInfo.testnet_preprod()
    const prvKey = accountKey.to_raw_key()
    fromAccount.accountKey = accountKey
    fromAccount.accountKeyStr = accountKey.to_bech32()
    fromAccount.pubKey = publicKey
    fromAccount.pubKeyStr = publicKey.to_bech32()
    fromAccount.prvKey = prvKey
    fromAccount.prvKeyStr = prvKey.to_bech32()
  })

  function buildTxs() {
    try {
      const CardanoWasm = walletCore.CardanoWasm

      const linearFee = CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str('44'), // Constant fee factor (example)
        CardanoWasm.BigNum.from_str('155381') // Per-byte fee factor (example)
      )
      const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(linearFee)
        .pool_deposit(CardanoWasm.BigNum.from_str('5000'))
        .key_deposit(CardanoWasm.BigNum.from_str('2000000'))
        .max_value_size(4000)
        .max_tx_size(16384)
        .coins_per_utxo_byte(CardanoWasm.BigNum.from_str('4310'))
        .build()
      const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
      // add a keyhash input - for ADA held in a Shelley-era normal address (Base, Enterprise, Pointer)
      const prvKey = fromAccount.prvKey as PrivateKey
      const inputAmount = CardanoWasm.BigNum.from_str('10000000')
      // UTXO details for the input (use your specific UTXO details)
      const txHash = CardanoWasm.TransactionHash.from_bytes(
        Buffer.from('b79aa9deb5d8aac845fdcea12a6ad175e5393e7a15fdc0a27604f0e7d384e318', 'hex') // Replace with transaction hash of the UTXO
      )
      const txIndex = 1 // Replace with the UTXO index
      const utxo = CardanoWasm.TransactionUnspentOutputs.from_json(
        JSON.stringify({
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
      )

      // base address
      const receiverAddress = CardanoWasm.Address.from_bech32(
        'addr_test1qpfapec2gwusjg3cqhhp8apry5kzh95tq2q7cdtepe5k7v38g96gcuuu7scm4jzaafda27qx7pes2eyvg8e8kpgm353swpqeyn'
      )

      // set the time to live - the absolute slot value before the tx becomes invalid
      txBuilder.set_ttl(410021)

      // once the transaction is ready, we build it to get the tx body without witnesses
      const txBody = txBuilder.build()
      const txsHashed = CardanoWasm.Transaction.from_hex(txBody.to_hex())
      console.log('>>> / file: Test.vue:110 / txHash:', txsHashed)

      //
      result.value = {
        rootkey: fromAccount.rootkeyStr,
        baseAddress: fromAccount.baseAddressStr,
        toAddress: toAddress.value,
        amount: amount.value,
        linearFee: linearFee
      }
    } catch (error) {
      console.error('>>> / file: Test.vue:118 / error::: ', error)
    }
  }
</script>

<template>
  <div class="flex h-full w-full flex-col items-center px-4">
    <div class="w-full">
      <a-form size="small">
        <a-form-item class="!mb-1" label="Mnemonic">
          <a-textarea v-model:value="fromAccount.mnemonic" />
        </a-form-item>
        <a-form-item class="!mb-1" label="Base address (bech_32)">
          <a-textarea :value="fromAccount.baseAddressStr" />
        </a-form-item>
        <a-form-item class="!mb-1" label="Account key (bech_32)">
          <a-textarea :value="fromAccount.accountKeyStr" />
        </a-form-item>
        <a-form-item class="!mb-1" label="Pubkey (bech_32)">
          <a-textarea :value="fromAccount.pubKeyStr" />
        </a-form-item>
        <a-form-item class="!mb-1" label="Privkey (bech_32)">
          <a-textarea :value="fromAccount.prvKeyStr" />
        </a-form-item>
        <a-form-item class="!mb-1" label="Rootkey (bech_32)">
          <a-textarea :value="fromAccount.rootkeyStr" :rows="3" />
        </a-form-item>
        <a-divider />
        <a-form-item class="!mb-1" label="Receiver">
          <a-textarea v-model:value="toAddress" />
        </a-form-item>
        <a-form-item class="!mb-1" label="Amount (tADA)">
          <a-input v-model:value="amount" />
        </a-form-item>
      </a-form>
    </div>
    <a-button @click="buildTxs()"> Build Txs </a-button>
    <div class="w-full">
      <highlightjs language="js" class="w-full text-xs" :code="JSON.stringify(result, null, 2)" />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
