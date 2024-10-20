import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

export const AuthGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  if (to.meta.requiresAuth) {
    const { currentWallet } = useAuthV2()
    console.log('Router: walletAccount:', currentWallet)
    if (!currentWallet) {
      console.log('redirect to auth')
      next({ name: 'Auth' })
    } else {
      console.log('Next to home')
      next()
    }
  } else {
    next()
  }
}
