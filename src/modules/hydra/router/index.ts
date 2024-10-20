// Composables
import type { BreadscrumbMeta } from '@/interface/breadscrumb.type'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/hydra',
    component: () => import('@/layouts/Default.vue'),

    children: [
      {
        path: 'fast-transfer',
        name: 'HydraFastTransfer',
        component: () =>
          import(
            /* webpackChunkName: "home" */ '@modules/hydra/views/FastTransfer.vue'
          ),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: 'test',
        name: 'HydraTest',
        component: () =>
          import(
            /* webpackChunkName: "home" */ '@modules/hydra/views/Test.vue'
          ),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
]

export default routes
