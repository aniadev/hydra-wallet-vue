// Composables
// import type { BreadscrumbMeta } from '@/interface/breadscrumb.type'
import type { RouteRecordRaw } from 'vue-router'
import RockPaperScissorsV2 from '../views/RockPaperScissorsV2.vue'

import RPStest from '../views/RPStest.vue'
import Games from '../views/Games.vue'
import EmbeddedGame from '../views/EmbeddedGame.vue'
import RockPaperScissors from '../views/RockPaperScissors.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/games',
    component: () => import('@/layouts/Default.vue'),
    children: [
      {
        path: '',
        name: 'Games',
        component: Games,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'test',
        name: 'HydraTest',
        component: RPStest,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'rock-paper-scissors',
        name: 'RockPaperScissors',
        component: RockPaperScissors,
        meta: {
          requiresAuth: true
        }
      }
    ]
  },
  {
    path: '/hydra-game',
    component: () => import('@/layouts/Game.vue'),
    children: [
      {
        path: 'rock-paper-scissors',
        name: 'RPSv2',
        component: RockPaperScissorsV2,
        meta: {
          requiresAuth: true
        }
      }
    ]
  },

  {
    path: '/playground',
    component: () => import('@/layouts/Playground.vue'),
    children: [
      {
        path: 'test',
        name: 'RPStest',
        component: RPStest,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'rps',
        name: 'RPS',
        component: EmbeddedGame,
        meta: {
          requiresAuth: true
        }
      }
    ]
  }
]

export default routes
