// Composables
import type { BreadscrumbMeta } from '@/interface/breadscrumb.type'
import type { RouteRecordRaw } from 'vue-router'
import FastTransfer from '@modules/hydra/views/FastTransfer.vue'
import Test from '@modules/hydra/views/Test.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/hydra',
    component: () => import('@/layouts/Default.vue'),

    children: [
      {
        path: 'fast-transfer',
        name: 'HydraFastTransfer',
        component: FastTransfer,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'test',
        name: 'HydraTest',
        component: Test,
        meta: {
          requiresAuth: true
        }
      }
    ]
  }
]

export default routes
