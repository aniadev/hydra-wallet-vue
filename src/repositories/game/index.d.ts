import type { UTxOObject } from '@/lib/hydra-bridge/types/utxo.type'
import type { RoomDto } from '@/modules/games/rps-v2/types/dto'

export namespace HydraGameDto {
  export namespace CheckAccountExisted {
    type ResponseContent = {
      data: boolean
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }

  export namespace GetAccountInfo {
    type ResponseContent = {
      data: {
        id: number
        walletAddress: string
        alias: string
        avatar?: string
        createdAt: string
      }
      statusCode: number
      message: string
      status: 'success' | 'error'
    }
  }

  export namespace CreateAccount {
    type RequestContent = {
      walletAddress: string
      password: string
      alias?: string
      avatar?: string
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

  export namespace SignIn {
    type RequestContent = {
      walletAddress: string
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
        items: RoomDto[]
        hasNextPage: boolean
        page: number
        limit: number
      }
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
