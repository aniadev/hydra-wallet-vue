export namespace GameApiNsp {
  export type InteractFunction = (...args: unknown[]) => void | Promise<void> | unknown | Promise<unknown>

  export enum RequestName {
    FetchLobbyList = 'fetchLobbyList',
    FetchLobbyItem = 'fetchLobbyItem'
  }

  export type InteractionMessage = {
    protocol: 'game-api'
    type: 'request' | 'response'
    payload: {
      fncName: string
      args: any[]
      result?: any
    }
  }

  export class GameApi {
    functions: Record<string, InteractFunction> = {}
    windowInstance: Window
    constructor(window: Window) {
      this.windowInstance = window
      // this.functions = (window as any).GAME_API.functions as any
    }
    setFunc(name: string, fn: InteractFunction) {
      if (typeof fn === 'function') {
        this.functions[name] = fn
        return this
      } else {
        throw new Error(`Provided value for "${name}" is not a function`)
      }
    }

    call<T = InteractFunction>(name: string, ...args: any[]) {
      if (typeof this.functions[name] === 'function') {
        console.log('[GameApi][call]: ', `Function [${name}] `, `Args: `, args)
        return this.functions[name](...args) as T
      } else {
        throw new Error(`Function "${name}" does not exist`)
      }
    }

    request<T>(name: string, { args = null, timeout = 60000 }: { args?: any; timeout?: number } = {}) {
      return new Promise<T>((resolve, reject) => {
        try {
          const data: InteractionMessage = {
            protocol: 'game-api',
            type: 'request',
            payload: {
              fncName: name,
              args
            }
          }
          this.windowInstance.parent.postMessage(data, '*')
          this.windowInstance.addEventListener(
            'message',
            (event: MessageEvent<InteractionMessage>) => {
              if (event.data.protocol !== 'game-api') return
              console.log('[GameApi][listen-message]: ', event.data)
              const { type, payload } = event.data
              if (type === 'response' && payload.fncName === name) {
                try {
                  const result = JSON.parse(payload.result)
                  resolve(result)
                } catch (error) {
                  reject(new Error(`[GameApi][request]: Error parsing response: ${error}`))
                }
              }
            },
            { once: true }
          )
          setTimeout(() => {
            reject(new Error(`[GameApi][request]: Request "${name}" timed out`))
            this.windowInstance.removeEventListener('message', () => {})
          }, timeout)
        } catch (error) {
          reject(error)
        }
      })
    }
  }
}

export function buildResponseMessage(funcName: string, result: any) {
  const data: GameApiNsp.InteractionMessage = {
    protocol: 'game-api',
    type: 'response',
    payload: {
      fncName: funcName,
      args: [],
      result: JSON.stringify(result)
    }
  }
  return data
}
