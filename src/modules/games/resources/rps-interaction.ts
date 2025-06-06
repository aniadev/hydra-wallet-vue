import mitt from 'mitt'

type Options = {
  eventName?: string
  customEmitter?: ReturnType<typeof mitt>
}

export type BaseEventDataType = {
  type: string
  data?: unknown
}

export class BaseInteraction {
  public emitter = mitt()
  public options: Options = {
    eventName: 'game-interaction'
  }
  public onMessage: (data: BaseEventDataType) => unknown | Promise<unknown> = async () => {}
  constructor(options?: Options) {
    this.options = options ?? this.options
  }
  get eventName() {
    return this.options.eventName || 'game-interaction'
  }
  public emit(data: BaseEventDataType) {
    this.emitter.emit(this.eventName, data)
  }
}

export class LobbyInteractionImpl extends BaseInteraction {
  constructor() {
    super({
      eventName: 'lobby'
    })

    this.emitter.on(this.eventName, (data: BaseEventDataType) => {
      this.onMessage(data)
    })
  }

  createLobby() {
    console.log('Create lobby interaction')
  }
  joinLobby() {
    console.log('Join lobby interaction')
  }
  setLobbyItems(items: Room[]) {
    console.log('Set lobby items interaction', items)
  }
  renderLobbyList() {
    console.log('Render lobby list interaction')
  }
  setLoading(isLoading: boolean) {
    console.log('Set loading interaction', isLoading)
  }
}

export class GameInteraction {
  lobby: LobbyInteractionImpl | null = null
  constructor() {
    this.init()
  }

  init() {
    if (!window) {
      throw new Error('Window is not defined')
    }
    // @ts-ignore
    window.gameInteraction = this
    // @ts-ignore
    this.lobby = window.lobby as LobbyInteractionImpl
  }
}
