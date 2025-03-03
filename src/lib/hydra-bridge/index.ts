import axios, { Axios, type AxiosInstance } from 'axios'
import type { HydraCommand, HydraPayload } from './types/payload.type'
import type { SubmitTxBody } from './types/submit-tx.type'
import { buildUrl } from './utils/builder'
import type { HydraBridgeSubmitter } from './types/submitter.type'
import { defaultSubmitter } from './utils/defaultSubmitter'
import type { CommitBody } from './types/commit.type'

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
}

export class HydraBridge {
  conn: CreateHydraBridgeOptions

  private _websocket: WebSocket | null = null
  private _onMessageCallback: (event: HydraPayload) => void = () => {}
  private _submitter: HydraBridgeSubmitter

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
      console.log('HydraBridge::: onopen')
    }
    this._websocket.onmessage = (ev: MessageEvent) => {
      this.rawMessageHandler(ev)
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

  private rawMessageHandler(event: MessageEvent) {
    try {
      const data = event.data
      const payload = JSON.parse(data) as HydraPayload
      this._onMessageCallback(payload)
    } catch (error) {
      console.error('HydraBridge::: rawMessageHandler error', error)
    }
  }
}
