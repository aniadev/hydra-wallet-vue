// Composables
// import type { BreadscrumbMeta } from '@/interface/breadscrumb.type'
import type { RouteRecordRaw } from 'vue-router'
import RockPapperScissors from '../views/RockPapperScissors.vue'
import TestTransaction from '../views/TestTransaction.vue'
import Games from '../views/Games.vue'

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
        path: 'rock-paper-scissors',
        name: 'RockPaperScissors',
        component: RockPapperScissors,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'test',
        name: 'HydraTest',
        component: TestTransaction,
        meta: {
          requiresAuth: true
        }
      }
    ]
  }
]

export default routes
