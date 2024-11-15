// Composables
// import type { BreadscrumbMeta } from '@/interface/breadscrumb.type'
import type { RouteRecordRaw } from 'vue-router'
import RockPapperScissors from '../views/RockPapperScissors.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/games',
    component: () => import('@/layouts/Default.vue'),

    children: [
      {
        path: 'rock-paper-scissors',
        name: 'RockPaperScissors',
        component: RockPapperScissors,
        meta: {
          requiresAuth: true
        }
      }
      // {
      //   path: 'test',
      //   name: 'HydraTest',
      //   component: Test,
      //   meta: {
      //     requiresAuth: true
      //   }
      // }
    ]
  }
]

export default routes
