import type { HydraCommand, HydraPayload } from './types/payload.type'
import type { SubmitTxBody } from './types/submit-tx.type'
import type { HydraBridgeSubmitter } from './types/submitter.type'
import type { CommitBody } from './types/commit.type'
import type { ProtocolParameters } from './types/protocol-parameters.type'
import type { HydraBridgeFetcher } from './types/fetcher.type'
import type { TxHash, UTxOObject } from './types/utxo.type'

import axios, { Axios, type AxiosInstance } from 'axios'
import { buildUrl } from './utils/builder'
import { defaultSubmitter } from './utils/defaultSubmitter'
import { defaultFetcher } from './utils/defaultFetcher'
import { uniq } from 'lodash-es'
import { BigNum, CoinSelectionStrategyCIP2, PrivateKey } from '@emurgo/cardano-serialization-lib-browser'

interface CreateHydraBridgeOptions {
  host: string
  port: number | string
  protocol: 'http' | 'https' | 'ws' | 'wss'
  /**
   * Specify weather the client wants to receive the full node history. Default is yes.
   */
  noHistory?: boolean
  /**
   * Specify weather the client wants see the snapshot utxo. Default is yes.
   */
  noSnapshotUtxo?: boolean
  /**
   * Specify whether the client wants see the transaction server outputs filtered by given address.
   */
  address?: string
  submitter?: HydraBridgeSubmitter
  fetcher?: HydraBridgeFetcher
}

export class HydraBridge {
  conn: CreateHydraBridgeOptions

  private _websocket: WebSocket | null = null
  private _onMessageCallback: (event: HydraPayload) => void = () => {}
  private _onErrorCallback: (event: Event, ws: WebSocket | null) => void = () => {}
  private _onOpenCallback: () => void = () => {}
  private _submitter: HydraBridgeSubmitter
  private _fetcher: HydraBridgeFetcher
  private _protocolParameters: ProtocolParameters | null = null
  private _snapshotUtxo: UTxOObject = {}
  // private _wallet: AppWallet

  constructor(options: CreateHydraBridgeOptions) {
    console.log('HydraBridge constructor')
    this.conn = {
      host: options.host,
      port: options.port,
      protocol: options.protocol,
      noHistory: options.noHistory,
      noSnapshotUtxo: options.noSnapshotUtxo,
      address: options.address
    }
    this._submitter = options.submitter || defaultSubmitter(this)
    this._fetcher = options.fetcher || defaultFetcher(this)
  }

  get networkInfo() {
    const queryParams = {
      ...(this.conn?.noHistory ? { history: 'no' } : {}),
      ...(this.conn?.noSnapshotUtxo ? { 'snapshot-utxo': 'no' } : {}),
      ...(this.conn?.address ? { address: this.conn.address } : {})
    }
    console.log('queryParams', queryParams)
    const httpProtocol =
      this.conn.protocol === 'ws' ? 'http' : this.conn.protocol === 'wss' ? 'https' : this.conn.protocol
    const httpUrl = buildUrl({
      protocol: httpProtocol,
      host: this.conn.host,
      port: this.conn.port
    })
    const socketUrl = buildUrl({
      protocol: this.conn.protocol,
      host: this.conn.host,
      port: this.conn.port,
      queryParams
    })
    return { socketUrl, httpUrl }
  }

  get apiFetch(): AxiosInstance {
    return axios.create({
      baseURL: this.networkInfo.httpUrl,
      url: '/',
      timeout: 10000
    })
  }

  get snapshotUtxoArray() {
    const txIds = Object.keys(this._snapshotUtxo) as TxHash[]
    return txIds.map(txId => {
      const [txHash, txIndex] = txId.split('#')
      const utxo = this._snapshotUtxo[txId]
      return {
        input: {
          transaction_id: txHash,
          index: Number(txIndex)
        },
        output: {
          address: utxo.address,
          amount: {
            coin: String(utxo.value.lovelace),
            multiasset: null
          },
          plutus_data: null,
          script_ref: null
        }
      }
    })
  }

  addSubmitter(submitter: HydraBridgeSubmitter) {
    this._submitter = submitter
  }

  connect() {
    console.log('HydraBridge connect')
    if (this._websocket) {
      this._websocket.close()
      this._websocket = null
    }
    this._websocket = new WebSocket(this.networkInfo.socketUrl)
    this._websocket.onopen = () => {
      this._onOpenCallback()
      this.queryProtocolParameters()
    }
    this._websocket.onmessage = (ev: MessageEvent) => {
      this.rawMessageHandler(ev)
    }
    this._websocket.onerror = (ev: Event) => {
      this._onErrorCallback(ev, this._websocket)
    }
  }

  disconnect() {
    console.log('HydraBridge disconnect')
    if (this._websocket) {
      this._websocket.close()
      this._websocket = null
    }
  }

  async sendCommand(data: {
    command: HydraCommand
    payload?: Record<string, any>
    afterSendCb?: () => void | Promise<void>
  }) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    const { command, payload, afterSendCb } = data
    const _payload = { tag: command, ...payload }
    this._websocket.send(JSON.stringify(_payload))
    if (afterSendCb) {
      await afterSendCb()
    }
  }

  async commit(data: CommitBody) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    return this._submitter.commit(data)
  }

  async submitCardanoTransaction(data: SubmitTxBody) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    return this._submitter.submitCardanoTx(data)
  }

  onMessage(callback: (event: HydraPayload) => void) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    this._onMessageCallback = callback
  }
  onError(callback: (event: Event, ws?: WebSocket | null) => void) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    this._onErrorCallback = callback
  }
  onOpen(callback: () => void) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    this._onOpenCallback = callback
  }

  async queryProtocolParameters() {
    try {
      this._protocolParameters = await this._fetcher.queryProtocolParameters()
      return this._protocolParameters
    } catch (error) {
      console.error('HydraBridge::: queryProtocolParameters error', error)
      throw new Error('Failed to query protocol parameters')
    }
  }

  async querySnapshotUtxo() {
    try {
      const utxo = await this._fetcher.querySnapshotUtxo()
      this._snapshotUtxo = utxo
      return utxo
    } catch (error) {
      console.error('HydraBridge::: queryUtxo error', error)
      throw new Error('Failed to query utxo')
    }
  }

  private rawMessageHandler(event: MessageEvent) {
    try {
      const data = event.data
      const payload = JSON.parse(data) as HydraPayload
      this._onMessageCallback(payload)
    } catch (error) {
      console.error('HydraBridge::: rawMessageHandler error', error)
    }
  }

  get addressesInHead() {
    const addresses = this.snapshotUtxoArray.map(utxo => utxo.output.address)
    return uniq(addresses)
  }

  async createTransaction({ toAddress, txHash, lovelace }: { toAddress: string; txHash: TxHash; lovelace: string }) {
    const getTxBuilder = (protocolParameters: ProtocolParameters) => {
      const linearFee = CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str('44'),
        CardanoWasm.BigNum.from_str('155381')
      )
      const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(linearFee)
        .pool_deposit(CardanoWasm.BigNum.from_str(`${protocolParameters.stakePoolDeposit}`)) // stakePoolDeposit
        .key_deposit(CardanoWasm.BigNum.from_str(`${protocolParameters.stakeAddressDeposit}`)) // stakeAddressDeposit
        .max_value_size(protocolParameters.maxValueSize) // maxValueSize
        .max_tx_size(protocolParameters.maxTxSize) // maxTxSize
        .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(`${protocolParameters.utxoCostPerByte}`))
        .build()
      const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
      return txBuilder
    }

    if (!this._protocolParameters) {
      this._protocolParameters = await this.queryProtocolParameters()
    }
    const txBuilder = getTxBuilder(this._protocolParameters)
    await this.querySnapshotUtxo()
    // check valid address
    if (!this.addressesInHead.includes(toAddress)) {
      throw new Error('Invalid toAddress')
    }
    // check valid txId
    const utxoInput = this.snapshotUtxoArray.find(utxo => {
      const [txId, txIndex] = txHash.split('#')
      return utxo.input.transaction_id === txId && utxo.input.index === Number(txIndex)
    })
    if (!utxoInput) {
      throw new Error('Invalid txId')
    }
    const fromAddressBech32 = utxoInput.output.address
    const wasmUtxos = CardanoWasm.TransactionUnspentOutputs.new()
    wasmUtxos.add(CardanoWasm.TransactionUnspentOutput.from_json(JSON.stringify(utxoInput)))
    txBuilder.add_inputs_from(wasmUtxos, CoinSelectionStrategyCIP2.LargestFirst)

    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(toAddress)
    const amountSend = lovelace

    const datumJsonData = {
      0: 'Hello i am Hai dev'
    }
    const datum = CardanoWasm.PlutusData.new_bytes(Buffer.from(JSON.stringify(datumJsonData)))
    const datumHash = CardanoWasm.hash_plutus_data(datum) //  Nêu sdụng inlineDatum thì không cần datumHash

    // add output
    const txOutput1 = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountSend))
    )
    txOutput1.set_plutus_data(datum)
    txBuilder.add_output(txOutput1)

    // add metadata
    const auxiliaryData = CardanoWasm.AuxiliaryData.new()
    const data = { 0: 'Hello i am Hai dev' }
    const metadata = CardanoWasm.GeneralTransactionMetadata.new()
    const txMetadatum = CardanoWasm.encode_json_str_to_metadatum(
      JSON.stringify(data),
      CardanoWasm.MetadataJsonSchema.BasicConversions
    )
    metadata.insert(BigNum.from_str('0'), txMetadatum)
    auxiliaryData.set_metadata(metadata)
    txBuilder.set_auxiliary_data(auxiliaryData)

    // calculate the fee
    const feeAmount = '0'
    txBuilder.set_fee(CardanoWasm.BigNum.from_str(feeAmount))

    // calculate the min fee required and send any change to an address
    const shelleyChangeAddress = CardanoWasm.Address.from_bech32(fromAddressBech32)
    txBuilder.add_change_if_needed(shelleyChangeAddress)

    // once the transaction is ready, we build it to get the tx body without witnesses
    const txBody = txBuilder.build()
    const getTxBodyHash = (txBody: any) => {
      const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
      return tx.transaction_hash()
    }
    const txBodyHash = getTxBodyHash(txBody)
    const witnessSet = CardanoWasm.TransactionWitnessSet.new()
    const tx = CardanoWasm.Transaction.new(txBody, witnessSet, auxiliaryData)
    return tx.to_hex()
  }

  /**
   * @param cborHex
   * @param privateKey bech32 private key or PrivateKey instance
   * @returns signed transaction in hex format
   */
  async signTransaction({ cborHex, privateKey }: { cborHex: string; privateKey: string | PrivateKey }) {
    let _privateSigningKey: PrivateKey
    if (typeof privateKey === 'string') {
      _privateSigningKey = PrivateKey.from_bech32(privateKey)
    } else {
      _privateSigningKey = privateKey
    }
    const unsignedTx = CardanoWasm.Transaction.from_bytes(Buffer.from(cborHex, 'hex'))
    const txBody = unsignedTx.body()
    const auxiliaryData = unsignedTx.auxiliary_data()

    const getTxBodyHash = (txBody: any) => {
      const tx = CardanoWasm.FixedTransaction.new_from_body_bytes(txBody.to_bytes())
      return tx.transaction_hash()
    }
    const txHash = getTxBodyHash(txBody)
    const witnessSet = unsignedTx.witness_set()
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, _privateSigningKey)
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new()
    vkeyWitnesses.add(vkeyWitness)
    witnessSet.set_vkeys(vkeyWitnesses)
    const tx = CardanoWasm.Transaction.new(txBody, witnessSet, auxiliaryData)
    return tx.to_hex()
  }
}
