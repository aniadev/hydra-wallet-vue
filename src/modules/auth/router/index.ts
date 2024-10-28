// Composables
import type { BreadscrumbMeta } from '@/interface/breadscrumb.type'
import type { RouteRecordRaw } from 'vue-router'
import Auth from '@modules/auth/views/Auth.vue'
import Create from '@modules/auth/views/Create.vue'
import Import from '@modules/auth/views/Import.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/layouts/Auth.vue'),
    children: [
      {
        path: '',
        name: 'Auth',
        component: Auth,
        meta: {}
      },
      {
        path: 'import',
        name: 'AuthImport',
        component: Import,
        meta: {}
      },
      {
        path: 'create',
        name: 'AuthCreate',
        component: Create,
        meta: {}
      }
    ]
  }
]

export default routes
