import getRepository, { RepoName } from '@/repositories'
import type { HydraGameRepository } from '@/repositories/game'
import { defineStore } from 'pinia'
import type { Room } from '../types'

export const useRpsStoreV2 = defineStore('game-rps-store-v2', () => {
  const hydraGameApi = getRepository(RepoName.HydraGame) as HydraGameRepository

  const rooms = reactive({
    isLoading: false,
    items: [] as Room[]
  })

  async function fetchRooms() {
    try {
      rooms.isLoading = true
      const rs = await hydraGameApi.getGameRooms()
      rooms.items = rs.data.items
    } catch (error: any) {
      console.error(error)
    } finally {
      rooms.isLoading = false
    }
  }

  return {
    rooms,
    fetchRooms
  }
})
