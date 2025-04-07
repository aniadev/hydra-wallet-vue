import type { UTxOObject } from '@/lib/hydra-bridge/types/utxo.type'

export namespace HydraGameDto {
  export namespace GetAccountInfo {
    type ResponseContent = {
      data: {
        id: number
        address: string
        avatar: string | null
        alias: string | null
        createdAt: string
      }
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }

  export namespace CreateAccount {
    type RequestContent = {
      address: string
      password: string
      alias?: string
      avatar?: string
    }
    type ResponseContent = {
      data: {
        id: number
        address: string
        avatar: string | null
        alias: string | null
        createdAt: string
      }
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }

  export namespace SignIn {
    type RequestContent = {
      address: string
      password: string
    }
    type ResponseContent = {
      data: {
        accessToken: string
      }
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }

  // APIs for game rock-paper-scissors
  // TODO: Migrate after
  export namespace GetGameRooms {
    type ResponseContent = {
      data: {
        id: number
        name: string
        status: 'INACTIVE' | 'ACTIVE'
        createdAt: string
        party: {
          id: number
          description: null
          nodes: number
          status: 'INACTIVE' | 'ACTIVE'
          createdAt: string
        }
        /**
         * @description Danh sách user đã join vào room
         */
        gameRoomDetails: {
          id: number
          port: number
        }[]
        betAmount: number
      }[]
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }
  export namespace GetGameRoomDetail {
    type ResponseContent = {
      data: {
        id: number
        name: string
        status: 'INACTIVE' | 'ACTIVE'
        createdAt: string
        party: {
          id: number
          description: null
          nodes: number
          hydraNodes: Array<{
            id: number
            port: number
            description: string
            vkey: string
          }>
          status: 'INACTIVE' | 'ACTIVE'
          createdAt: string
        }
        gameRoomDetails: {
          id: number
          port: number
        }[]
      }
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }
}
