import {
  HydraCommand,
  HydraHeadStatus,
  HydraHeadTag,
  type BasePayload,
  type HeadIsInitializing,
  type HydraPayload,
  type SnapshotConfirmed
} from './types/payload.type'
import type { SubmitTxBody } from './types/submit-tx.type'
import type { HydraBridgeSubmitter } from './types/submitter.type'
import type { CommitBody } from './types/commit.type'
import type { ProtocolParameters } from './types/protocol-parameters.type'
import type { HydraBridgeFetcher } from './types/fetcher.type'
import type { TxHash, UTxOObject } from './types/utxo.type'

import axios, { Axios, type AxiosInstance } from 'axios'
import { buildUrl, snapshotUtxoToArray } from './utils/builder'
import { defaultSubmitter } from './utils/defaultSubmitter'
import { defaultFetcher } from './utils/defaultFetcher'
import { uniq } from 'lodash-es'
import { BigNum, CoinSelectionStrategyCIP2, PrivateKey } from '@emurgo/cardano-serialization-lib-browser'
import { getTxBuilder } from './utils/transaction'
import mitt, { type Emitter } from 'mitt'
import type { AppWallet } from '../hydra-wallet'

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

type HydraBridgeEvents = {
  onMessage: HydraPayload
  onError: Event
  onOpen: void
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
  private _eventEmitter: Emitter<HydraBridgeEvents> = mitt<HydraBridgeEvents>()
  private _latestPayload: HydraPayload | null = null
  private _currentHeadId: string | null = null
  private _currentHeadStatus: HydraHeadStatus = HydraHeadStatus.Idle
  private _hydraVKey: string | null = null

  constructor(options: CreateHydraBridgeOptions) {
    console.log('[📣 HydraBridge] constructor')
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
    return snapshotUtxoToArray(this._snapshotUtxo)
  }
  get lastestPayload() {
    return this._latestPayload
  }
  get headStatus() {
    return this._currentHeadStatus
  }
  get headId() {
    return this._currentHeadId
  }
  get vkey() {
    return this._hydraVKey
  }

  addSubmitter(submitter: HydraBridgeSubmitter) {
    this._submitter = submitter
  }

  connect() {
    console.log('[📣 HydraBridge] Create connection')
    if (this._websocket) {
      this._websocket.close()
      this._websocket = null
    }
    this._websocket = new WebSocket(this.networkInfo.socketUrl)
    this._websocket.onopen = () => {
      this._onOpenCallback()
      this._eventEmitter.emit('onOpen')
      this.queryProtocolParameters()
    }
    this._websocket.onmessage = (ev: MessageEvent) => {
      this.rawMessageHandler(ev)
    }
    this._websocket.onerror = (ev: Event) => {
      this._onErrorCallback(ev, this._websocket)
      this._eventEmitter.emit('onError', ev)
    }
  }

  disconnect() {
    console.log('[📣 HydraBridge] disconnect')
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

  async waitHeadIsInitializing(timeoutMillis = 30000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.commands.init()
      console.log('[📣 HydraBridge] Waiting for head is initializing')
      const timeout = setTimeout(() => {
        reject(new Error('[📣 HydraBridge] Timeout initializing'))
      }, timeoutMillis)
      this._eventEmitter.on('onMessage', payload => {
        if (
          payload.tag === HydraHeadTag.HeadIsInitializing ||
          (payload.tag === HydraHeadTag.CommandFailed &&
            payload.clientInput.tag === HydraCommand.Init &&
            'tag' in (payload?.state as any) &&
            payload.state?.tag === 'Initial')
        ) {
          clearTimeout(timeout)
          resolve(true)
        }
      })
    })
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

  /**
   * @deprecated
   */
  onMessage(callback: (event: HydraPayload) => void) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    this._onMessageCallback = callback
  }
  /**
   * @deprecated
   */
  onError(callback: (event: Event, ws?: WebSocket | null) => void) {
    if (!this._websocket) {
      throw new Error('WebSocket connection is not established')
    }
    this._onErrorCallback = callback
  }
  /**
   * @deprecated
   */
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
      this._eventEmitter.emit('onMessage', payload)
      this._latestPayload = payload
      // internal state update
      // update current head id
      if (payload.tag === HydraHeadTag.HeadIsInitializing) {
        this._currentHeadId = payload.headId
      } else if (payload.tag === HydraHeadTag.Greetings) {
        payload.hydraHeadId && (this._currentHeadId = payload.hydraHeadId)
        this._currentHeadStatus = payload.headStatus
        this._hydraVKey = payload.me.vkey
      }
    } catch (error) {
      console.error('[📣 HydraBridge] error', error)
    }
  }

  get addressesInHead() {
    const addresses = this.snapshotUtxoArray.map(utxo => utxo.output.address)
    return uniq(addresses)
  }

  get commands() {
    return {
      newTx: (cborHex: string, description = '', cb?: () => any) =>
        this.sendCommand({
          command: HydraCommand.NewTx,
          payload: {
            transaction: {
              cborHex: cborHex,
              description: description ? 'Ledger Cddl Format' : '',
              type: 'Witnessed Tx ConwayEra'
            }
          },
          afterSendCb: cb
        }),
      init: () =>
        this.sendCommand({
          command: HydraCommand.Init
        }),
      close: () =>
        this.sendCommand({
          command: HydraCommand.Close
        }),
      abort: () =>
        this.sendCommand({
          command: HydraCommand.Abort
        }),
      fanout: () =>
        this.sendCommand({
          command: HydraCommand.Fanout
        }),
      contest: () =>
        this.sendCommand({
          command: HydraCommand.Contest
        }),
      recover: (recoverTxId: string) =>
        this.sendCommand({
          command: HydraCommand.Recover,
          payload: {
            recoverTxId
          }
        }),
      decommit: (cborHex: string) =>
        this.sendCommand({
          command: HydraCommand.Decommit,
          payload: {
            transaction: {
              cborHex: cborHex,
              description: 'Ledger Cddl Format',
              type: 'Witnessed Tx ConwayEra'
            }
          }
        }),
      newTxSync: (body: { cborHex: string; txHash: string; description?: string }) => this.sendTxSync(body)
    }
  }

  async sendTxSync({
    cborHex,
    txHash,
    description = ''
  }: {
    cborHex: string
    txHash: string
    description?: string
  }): Promise<Readonly<SnapshotConfirmed>> {
    return new Promise((resolve, reject) => {
      const payload = {
        transaction: {
          cborHex,
          description,
          type: 'Witnessed Tx ConwayEra'
        }
      }
      this.sendCommand({
        command: HydraCommand.NewTx,
        payload
      })
      const txTimeout = setTimeout(() => {
        reject(new Error('Tx is invalid: TxHash: ' + txHash))
      }, 20000)
      this._eventEmitter.on('onMessage', payload => {
        if (
          payload.tag === HydraHeadTag.SnapshotConfirmed &&
          payload.snapshot.confirmed.findIndex(tx => tx.txId === txHash) !== -1
        ) {
          clearTimeout(txTimeout)
          resolve(payload)
        }
      })
    })
  }

  public get events() {
    return this._eventEmitter
  }

  /**
   * @returns cBorHex of the signed transaction
   */
  async createTransaction({
    toAddress: _toAddress,
    txHash: _txHash,
    lovelace: _lovelace,
    inlineDatum: _inlineDatum,
    txMetadata: _txMetadata,
    secret: _secret
  }: {
    toAddress: string
    txHash: TxHash
    lovelace: string
    inlineDatum?: Record<string, any>
    txMetadata?: Record<string, any>[]
    secret: { privateKey: string | PrivateKey }
  }) {
    if (!this._protocolParameters) {
      this._protocolParameters = await this.queryProtocolParameters()
    }
    const txBuilder = getTxBuilder(this._protocolParameters)
    await this.querySnapshotUtxo()
    // check valid address
    if (!this.addressesInHead.includes(_toAddress)) {
      throw new Error('Invalid toAddress')
    }
    // check valid txId
    const utxoInput = this.snapshotUtxoArray.find(utxo => {
      const [txId, txIndex] = _txHash.split('#')
      return utxo.input.transaction_id === txId && utxo.input.index === Number(txIndex)
    })
    if (!utxoInput) {
      throw new Error('Invalid txId')
    }
    const fromAddressBech32 = utxoInput.output.address
    const txInput = CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxoInput.input.transaction_id, 'hex')),
      utxoInput.input.index
    )
    const inputAddress = CardanoWasm.Address.from_bech32(utxoInput.output.address)
    const inputValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(`${utxoInput.output.amount.coin}`))
    txBuilder.add_regular_input(inputAddress, txInput, inputValue)

    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(_toAddress)
    const amountSend = _lovelace

    // add output
    const txOutput1 = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountSend))
    )
    // add datum if needed
    // TODO: thêm các tùy chọn add datum
    if (_inlineDatum) {
      const datumJsonData = _inlineDatum || {}
      const datum = CardanoWasm.PlutusData.new_bytes(Buffer.from(JSON.stringify(datumJsonData)))
      const datumHash = CardanoWasm.hash_plutus_data(datum) //  Nêu sdụng inlineDatum thì không cần datumHash
      txOutput1.set_plutus_data(datum)
    }

    txBuilder.add_output(txOutput1)

    // add metadata
    /**
     * @example
     * txMetadata = {
     *    0: { "key": "value" },
     *    1: { "key": "value" },
     *    2: { "key": "value" }
     * }
     */
    const hasTxMetadata = (_txMetadata && Array.isArray(_txMetadata)) || false
    const auxiliaryData = CardanoWasm.AuxiliaryData.new()
    if (hasTxMetadata) {
      _txMetadata!.forEach((data, index) => {
        const _metadata = CardanoWasm.GeneralTransactionMetadata.new()
        const txMetadatum = CardanoWasm.encode_json_str_to_metadatum(
          JSON.stringify(data),
          CardanoWasm.MetadataJsonSchema.BasicConversions
        )
        _metadata.insert(BigNum.from_str(`${index}`), txMetadatum)
        auxiliaryData.set_metadata(_metadata)
        txBuilder.set_auxiliary_data(auxiliaryData)
      })
    }

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

    let _privateSigningKey: PrivateKey
    if (typeof _secret.privateKey === 'string') {
      _privateSigningKey = PrivateKey.from_bech32(_secret.privateKey)
    } else {
      _privateSigningKey = _secret.privateKey
    }

    const vkeyWitness = CardanoWasm.make_vkey_witness(txBodyHash, _privateSigningKey)
    const witnessSet = CardanoWasm.TransactionWitnessSet.new()
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new()
    vkeyWitnesses.add(vkeyWitness)
    witnessSet.set_vkeys(vkeyWitnesses)

    // Tạo giao dịch hoàn chỉnh với txBody, witnessSet, và auxiliaryData
    const tx = CardanoWasm.Transaction.new(txBody, witnessSet, hasTxMetadata ? auxiliaryData : undefined)
    return {
      txHash: txBodyHash.to_hex(),
      cborHex: tx.to_hex()
    }
  }

  /**
   * @returns
   * ```ts
   * { txHash: string, cborHex: string }
   * ```
   */
  async createTransactionWithMultiUTxO({
    toAddress: _toAddress,
    txHashes: _txInputHashes,
    lovelace: _lovelace,
    inlineDatum: _inlineDatum,
    txMetadata: _txMetadata,
    secret: _secret,
    fee: _fee = '0'
  }: {
    toAddress: string
    txHashes: TxHash[]
    lovelace: string
    inlineDatum?: Record<string, any>
    txMetadata?: Record<string, any>[]
    secret: { privateKey: string | PrivateKey }
    fee?: string
  }): Promise<{ txHash: string; cborHex: string }> {
    if (!this._protocolParameters) {
      this._protocolParameters = await this.queryProtocolParameters()
    }
    const txBuilder = getTxBuilder(this._protocolParameters)
    await this.querySnapshotUtxo()
    // check valid address
    if (!this.addressesInHead.includes(_toAddress)) {
      throw new Error('Invalid toAddress')
    }
    // check valid utxo input
    if (_txInputHashes.length === 0) {
      throw new Error('txInputHashes is empty')
    }
    const validTxInputHashes = _txInputHashes.every(txInputHash => {
      const utxo = this.snapshotUtxoArray.find(
        utxo => `${utxo.input.transaction_id}#${utxo.input.index}` === txInputHash
      )
      if (utxo) {
        return true
      }
      throw new Error('Invalid utxo input: ' + txInputHash)
    })
    if (!validTxInputHashes) {
      throw new Error('Invalid txInputHashes')
    }
    const utxoInputs = this.snapshotUtxoArray.filter(utxo =>
      _txInputHashes.includes(`${utxo.input.transaction_id}#${utxo.input.index}`)
    )
    const fromAddressBech32Map = uniq(utxoInputs.map(utxo => utxo.output.address))
    if (fromAddressBech32Map.length > 1) {
      throw new Error('utxo inputs must be from the same address')
    }
    const fromAddressBech32 = fromAddressBech32Map[0]
    utxoInputs.forEach(utxo => {
      const txInput = CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.input.transaction_id, 'hex')),
        utxo.input.index
      )
      const address = CardanoWasm.Address.from_bech32(utxo.output.address)
      const value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(`${utxo.output.amount.coin}`))
      txBuilder.add_regular_input(address, txInput, value)
    })

    // add output
    const shelleyOutputAddress = CardanoWasm.Address.from_bech32(_toAddress)
    const amountSend = _lovelace
    const txOutput1 = CardanoWasm.TransactionOutput.new(
      shelleyOutputAddress,
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountSend))
    )

    // add datum if needed
    // TODO: thêm các tùy chọn add datum
    if (_inlineDatum) {
      const datumJsonData = _inlineDatum || {}
      const datum = CardanoWasm.PlutusData.new_bytes(Buffer.from(JSON.stringify(datumJsonData)))
      const datumHash = CardanoWasm.hash_plutus_data(datum) //  Nêu sdụng inlineDatum thì không cần datumHash
      txOutput1.set_plutus_data(datum)
    }

    txBuilder.add_output(txOutput1)

    // add metadata
    /**
     * @example
     * txMetadata = {
     *    0: { "key": "value" },
     *    1: { "key": "value" },
     *    2: { "key": "value" }
     * }
     */
    const hasTxMetadata = (_txMetadata && Array.isArray(_txMetadata)) || false
    const auxiliaryData = CardanoWasm.AuxiliaryData.new()
    if (hasTxMetadata) {
      _txMetadata!.forEach((data, index) => {
        const _metadata = CardanoWasm.GeneralTransactionMetadata.new()
        const txMetadatum = CardanoWasm.encode_json_str_to_metadatum(
          JSON.stringify(data),
          CardanoWasm.MetadataJsonSchema.BasicConversions
        )
        _metadata.insert(BigNum.from_str(`${index}`), txMetadatum)
        auxiliaryData.set_metadata(_metadata)
        txBuilder.set_auxiliary_data(auxiliaryData)
      })
    }

    // calculate the fee
    const feeAmount = _fee
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

    let _privateSigningKey: PrivateKey
    if (typeof _secret.privateKey === 'string') {
      _privateSigningKey = PrivateKey.from_bech32(_secret.privateKey)
    } else {
      _privateSigningKey = _secret.privateKey
    }

    const vkeyWitness = CardanoWasm.make_vkey_witness(txBodyHash, _privateSigningKey)
    const witnessSet = CardanoWasm.TransactionWitnessSet.new()
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new()
    vkeyWitnesses.add(vkeyWitness)
    witnessSet.set_vkeys(vkeyWitnesses)

    // Tạo giao dịch hoàn chỉnh với txBody, witnessSet, và auxiliaryData
    const tx = CardanoWasm.Transaction.new(txBody, witnessSet, hasTxMetadata ? auxiliaryData : undefined)
    return {
      txHash: txBodyHash.to_hex(),
      cborHex: tx.to_hex()
    }
  }

  // TODO: Cần verify lại hàm này
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
