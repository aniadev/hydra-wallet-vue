import { pbkdf2Sync } from 'crypto'
import hash from 'hash.js'
import {
  AddressType,
  BaseAddress,
  Bip32PrivateKey,
  Bip32PrivateKeyHex,
  blake2b,
  CredentialType,
  DRepID,
  Ed25519PrivateKey,
  Ed25519PublicKeyHex,
  EnterpriseAddress,
  Hash28ByteBase16,
  HexBlob,
  NetworkId,
  RewardAddress
} from '../types/cardano-sdk'
import { HARDENED_KEY_START } from '../common/constants/index'

export const buildBip32PrivateKey = (entropy: string, password = ''): Bip32PrivateKey => {
  const PBKDF2_ITERATIONS = 4096
  const PBKDF2_KEY_SIZE = 96
  const PBKDF2_DIGEST_ALGORITHM = 'sha512'

  const _entropy = Buffer.from(entropy, 'hex')

  const xprv = pbkdf2Sync(password, _entropy, PBKDF2_ITERATIONS, PBKDF2_KEY_SIZE, PBKDF2_DIGEST_ALGORITHM)
  return Bip32PrivateKey.fromBytes(clampScalar(xprv))
}

export const clampScalar = (scalar: Buffer): Buffer => {
  if (scalar[0] !== undefined) {
    scalar[0] &= 0b1111_1000
  }
  if (scalar[31] !== undefined) {
    scalar[31] &= 0b0001_1111
    scalar[31] |= 0b0100_0000
  }
  return scalar
}

export const buildBaseAddress = (
  networkId: number,
  paymentKeyHash: Hash28ByteBase16,
  stakeKeyHash: Hash28ByteBase16
): BaseAddress => {
  return BaseAddress.fromCredentials(
    networkId,
    {
      hash: paymentKeyHash,
      type: CredentialType.KeyHash
    },
    {
      hash: stakeKeyHash,
      type: CredentialType.KeyHash
    }
  )
}

export const buildEnterpriseAddress = (networkId: number, paymentKeyHash: Hash28ByteBase16): EnterpriseAddress => {
  return EnterpriseAddress.fromCredentials(networkId, {
    hash: paymentKeyHash,
    type: CredentialType.KeyHash
  })
}

export const buildRewardAddress = (networkId: number, stakeKeyHash: Hash28ByteBase16): RewardAddress => {
  const cred = {
    type: CredentialType.KeyHash,
    hash: stakeKeyHash
  }
  return RewardAddress.fromCredentials(networkId, cred)
}

export const buildDRepID = (
  dRepKey: Ed25519PublicKeyHex,
  networkId: NetworkId = NetworkId.Testnet,
  addressType: AddressType = AddressType.EnterpriseKey
): DRepID => {
  const dRepKeyBytes = Buffer.from(dRepKey, 'hex')
  const dRepIdHex = blake2b(28).update(dRepKeyBytes).digest('hex')
  const paymentAddress = EnterpriseAddress.packParts({
    networkId,
    paymentPart: {
      hash: Hash28ByteBase16(dRepIdHex),
      type: CredentialType.KeyHash
    },
    type: addressType
  })
  return HexBlob.toTypedBech32<DRepID>('drep', HexBlob.fromBytes(paymentAddress))
}

/**
 * Build a set of keys from a given private key
 *
 * NOTE - Must be called after `await Crypto.Ready()`
 *
 * @param privateKeyHex - The BIP32 private key hex to derive keys from
 * @param accountIndex - The account index to derive keys for
 * @param keyIndex - The key index to derive keys for
 * @returns The payment and stake keys, and optionally the dRep key if a Bip32PrivateKey is provided
 */
export const buildKeys = (
  privateKeyHex: string | [string, string],
  accountIndex: number,
  keyIndex = 0
): {
  paymentKey: Ed25519PrivateKey
  stakeKey: Ed25519PrivateKey
  dRepKey?: Ed25519PrivateKey
} => {
  if (typeof privateKeyHex === 'string') {
    const privateKey = Bip32PrivateKey.fromHex(Bip32PrivateKeyHex(privateKeyHex))

    // hardened derivation
    const accountKey = privateKey.derive([
      HARDENED_KEY_START + 1852, // purpose
      HARDENED_KEY_START + 1815, // coin type
      HARDENED_KEY_START + accountIndex // account index
    ])

    const paymentKey = accountKey.derive([0, keyIndex]).toRawKey() // external chain, payment key index
    const stakeKey = accountKey.derive([2, 0]).toRawKey() // staking key, index 0
    const dRepKey = accountKey.derive([3, keyIndex]).toRawKey() // dRep Keys, index

    return { paymentKey, stakeKey, dRepKey }
  } else {
    const paymentKey = buildEd25519PrivateKeyFromSecretKey(privateKeyHex[0])
    const stakeKey = buildEd25519PrivateKeyFromSecretKey(privateKeyHex[1])

    return { paymentKey, stakeKey }
  }
}

export const buildEd25519PrivateKeyFromSecretKey = (secretKeyHex: string) => {
  return Ed25519PrivateKey.fromExtendedBytes(
    new Uint8Array(clampScalar(Buffer.from(hash.sha512().update(Buffer.from(secretKeyHex, 'hex')).digest())))
  )
}
