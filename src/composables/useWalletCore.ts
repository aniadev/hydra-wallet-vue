import type { WalletCore } from '@/interface/wallet.type'
import { $axios } from '@/utils/axios'
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser'
import { mnemonicToEntropy, generateMnemonic, entropyToMnemonic, getDefaultWordlist } from 'bip39'

export { CardanoWasm }

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

  /**
   *
   * @param mnemonic
   * @returns Acccount 1852' / 1815' / 0'
   */
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

  /**
   *
   * @param account : getCip1852Account
   * @returns path `1852'/1815'/0'/0/0`
   */
  function getBaseAddressFromMnemonic(mnemonic: string): CardanoWasm.BaseAddress {
    const rootKey = getRootKeyByMnemonic(mnemonic)
    // Derive the key using path 1852'/1815'/0'/0/0
    const accountKey = rootKey
      .derive(1852 | 0x80000000) // Purpose: 1852'
      .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // External chain: 0
      .derive(0) // Address index: 0
    const publicKey = accountKey.to_public()
    const network = CardanoWasm.NetworkInfo.testnet_preprod() // Use NetworkInfo.testnet() for testnet

    // Deriving the staking private key using the path 1852'/1815'/0'/2/0
    const stakingPrivateKey = rootKey
      .derive(1852 | 0x80000000) // Purpose: 1852'
      .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(2) // Internal chain: 2 (for staking)
      .derive(0) // Staking key index: 0

    const baseAddress = CardanoWasm.BaseAddress.new(
      network.network_id(),
      CardanoWasm.Credential.from_keyhash(publicKey.to_raw_key().hash()),
      CardanoWasm.Credential.from_keyhash(stakingPrivateKey.to_public().to_raw_key().hash())
    )

    return baseAddress
  }

  function getStakeAddressByRootkey(rootKey: CardanoWasm.Bip32PrivateKey): string {
    // Derive the key using path 1852'/1815'/0'/0/0
    const accountKey = rootKey
      .derive(1852 | 0x80000000) // Purpose: 1852'
      .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(0) // External chain: 0
      .derive(0) // Address index: 0
    const publicKey = accountKey.to_public()
    const network = CardanoWasm.NetworkInfo.testnet_preprod() // Use NetworkInfo.testnet() for testnet

    // Deriving the staking private key using the path 1852'/1815'/0'/2/0
    const stakingPrivateKey = rootKey
      .derive(1852 | 0x80000000) // Purpose: 1852'
      .derive(1815 | 0x80000000) // Coin type: 1815' (ADA)
      .derive(0 | 0x80000000) // Account index: 0'
      .derive(2) // Internal chain: 2 (for staking)
      .derive(0) // Staking key index: 0

    const baseAddress = CardanoWasm.BaseAddress.new(
      network.network_id(),
      CardanoWasm.Credential.from_keyhash(publicKey.to_raw_key().hash()),
      CardanoWasm.Credential.from_keyhash(stakingPrivateKey.to_public().to_raw_key().hash())
    )
    // get stake address
    const stakingCredential = baseAddress.stake_cred()
    // Create the RewardAddress (i.e., the stake address)
    const rewardAddress = CardanoWasm.RewardAddress.new(network.network_id(), stakingCredential)

    // Convert to bech32 format if desired
    const stakeAddress = rewardAddress.to_address().to_bech32()
    return stakeAddress
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

  function viewTransaction(cborHex: string) {
    const hexToBytes = (cborHex: string) => Uint8Array.from(Buffer.from(cborHex, 'hex'))
    const cborBytes = hexToBytes(cborHex)
    try {
      // Parse the CBOR bytes into a Transaction object
      const tx = CardanoWasm.Transaction.from_bytes(cborBytes)

      type TxInput = {
        transaction_id: string
        index: number
      }[]
      type TxOutput = {
        address: string
        amount: {
          coin: string
          multiasset: any | null
        }
        plutus_data: any | null
        script_ref: any | null
      }[]
      return {
        tx,
        inputs: JSON.parse(tx.body().inputs().to_json()) as TxInput,
        outputs: JSON.parse(tx.body().outputs().to_json()) as TxOutput,
        fee: JSON.parse(tx.body().fee().to_json())
      }
    } catch (error) {
      console.error('Failed to parse CBOR:', error)
      return null
    }
  }

  const walletCore = {
    viewTransaction,
    getCip1852Account,
    generateMnemonic,
    getBaseAddressFromMnemonic,
    getEnterpriseAddress,
    getEnterpriseAddressByMnemonic,
    getPrivateKeyByMnemonic,
    getRootKeyByMnemonic,
    createTransaction,
    registerWallet,
    validateWalletAddress,
    txFromHex,
    getStakeAddressByRootkey,
    CardanoWasm
  }

  return walletCore
}
