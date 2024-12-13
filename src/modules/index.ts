import type { StoreDefinition } from 'pinia'
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

// import modules
import ModuleAuth from '@modules/auth'
import ModuleHydra from '@modules/hydra'
import ModuleGames from '@modules/games'
import type { LangObjectType } from '@/plugins/i18n.plugin'

export type ModuleInterface = {
  name: string
  stores?: StoreDefinition
  routes?: RouteRecordRaw[]
  components?: Array<{ name: string; component: Component }>
  langs?: LangObjectType
}

const modules: ModuleInterface[] = [ModuleAuth, ModuleHydra, ModuleGames]

export default modules
