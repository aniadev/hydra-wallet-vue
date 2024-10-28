import type { RouteRecordRaw } from 'vue-router'

import Home from '@/modules/home/views/Home.vue'
import Setting from '@/modules/home/views/Setting.vue'
import Transfer from '@/modules/home/views/Transfer.vue'
import NotFound from '@/components/base/PageStatus/404.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/Default.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
        meta: {
          requiresAuth: true
        }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: Setting
      },
      {
        path: '/transfer',
        name: 'Transfer',
        component: Transfer
      },
      {
        path: '/*',
        name: 'NotFound',
        component: NotFound
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/layouts/Default.vue'),
    children: [
      {
        path: '',
        name: 'NotFound',
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: NotFound
      }
    ]
  }
]

export default routes
