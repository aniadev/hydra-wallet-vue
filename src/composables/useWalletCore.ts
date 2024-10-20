import type { WalletCore } from '@/interface/wallet.type'
import { $axios } from '@/utils/axios'
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser'
import { mnemonicToEntropy, generateMnemonic, entropyToMnemonic, getDefaultWordlist } from 'bip39'

export const useWalletCore = () => {
  // Purpose derivation (See BIP43)
  enum Purpose {
    CIP1852 = 1852 // see CIP 1852
  }

  // Cardano coin type (SLIP 44)
  enum CoinTypes {
    CARDANO = 1815
  }

  enum ChainDerivation {
    EXTERNAL = 0, // from BIP44
    INTERNAL = 1, // from BIP44
    CHIMERIC = 2 // from CIP1852
  }

  function harden(num: number): number {
    return 0x80000000 + num
  }

  function getCip1852Account(mnemonic: string): CardanoWasm.Bip32PrivateKey {
    const rootKey = getRootKeyByMnemonic(mnemonic)
    return rootKey.derive(harden(Purpose.CIP1852)).derive(harden(CoinTypes.CARDANO)).derive(harden(0)) // account #0
  }

  function getRootKeyByMnemonic(mnemonic: string): CardanoWasm.Bip32PrivateKey {
    const entropy = mnemonicToEntropy(mnemonic)
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy, 'hex'), Buffer.from(''))
    return rootKey
  }

  function getPrivateKeyByMnemonic(mnemonic: string): CardanoWasm.Bip32PrivateKey {
    const account = getCip1852Account(mnemonic)
    const prvKey = account.derive(ChainDerivation.EXTERNAL).derive(0)
    return prvKey
  }

  function getEnterpriseAddress(account: CardanoWasm.Bip32PrivateKey): CardanoWasm.BaseAddress {
    const enterpriseKey = account.derive(ChainDerivation.INTERNAL).derive(0).to_public()
    const baseAddr = CardanoWasm.BaseAddress.new(
      0,
      CardanoWasm.Credential.from_keyhash(enterpriseKey.to_raw_key().hash()),
      CardanoWasm.Credential.from_keyhash(enterpriseKey.to_raw_key().hash())
    )
    return baseAddr
  }

  function getEnterpriseAddressByMnemonic(mnemonic: string): CardanoWasm.BaseAddress {
    const account = getCip1852Account(mnemonic)
    return getEnterpriseAddress(account)
  }

  /**
   * Deserialize the CBOR-encoded transaction
   */
  function txFromHex(txsCborHex: string) {
    return CardanoWasm.Transaction.from_bytes(Buffer.from(txsCborHex, 'hex'))
  }

  async function createTransaction() {
    try {
      // Example usage of Cardano serialization library
      const txBuilder = CardanoWasm.TransactionBuilder.new({
        free() {}
      })
      // Add inputs, outputs, fees, etc. to the transaction builder
      // For example, adding an output:
      // const address = CardanoWasm.Address.from_bech32('addr...');
      // const amount = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('1000000'));
      // txBuilder.add_output(CardanoWasm.TransactionOutput.new(address, amount));

      const txBody = txBuilder.build()
      const tx = CardanoWasm.Transaction.new(txBody, CardanoWasm.TransactionWitnessSet.new())
      console.log('Transaction:', tx)
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  type WalletRegister = {
    name: string
    mnemonic: string
    passPhrase: string
  }
  async function registerWallet(wallet: WalletRegister) {
    try {
      const rs = (await $axios.post(`v2/wallets`, {
        name: wallet.name,
        mnemonic_sentence: wallet.mnemonic.split(' '),
        passphrase: wallet.passPhrase
      })) as WalletCore.WalletAccount
      return rs
    } catch (error) {
      console.log('[Register Wallet] Error:', error)
    }
  }

  function validateWalletAddress(address: string) {
    try {
      CardanoWasm.Address.from_bech32(address)
      return true
    } catch (error) {
      return false
    }
  }

  const walletCore = {
    getCip1852Account,
    generateMnemonic,
    getEnterpriseAddress,
    getEnterpriseAddressByMnemonic,
    getPrivateKeyByMnemonic,
    getRootKeyByMnemonic,
    createTransaction,
    registerWallet,
    validateWalletAddress,
    txFromHex,
    CardanoWasm
  }

  return walletCore
}
