<script lang="ts" setup>
  import IconMenuGames from '~icons/svg/menu-games.svg'
  import IconMenuHome from '~icons/svg/menu-home.svg'
  import IconMenuMission from '~icons/svg/menu-mission.svg'
  import IconMenuSwap from '~icons/svg/menu-swap.svg'

  const menuItems = [
    {
      title: 'Home',
      icon: IconMenuHome,
      route: '/'
    },
    {
      title: 'Swap',
      icon: IconMenuSwap,
      route: '#'
    },
    {
      title: 'Games',
      icon: IconMenuGames,
      route: '/games'
    },
    {
      title: 'Others',
      icon: IconMenuMission,
      route: '#'
    }
  ]

  const route = useRoute()
  const router = useRouter()
  const isActive = (route: string) => {
    if (route === '/') {
      return route === router.currentRoute.value.path
    }
    return router.currentRoute.value.path.includes(route)
  }
</script>

<template>
  <div class="main-menu flex h-full w-full items-center px-4">
    <div
      class="flex flex-1 items-center justify-center"
      v-for="(item, i) in menuItems"
      :key="i"
      :class="{ active: isActive(item.route) }"
    >
      <router-link :to="item.route || '#'" class="flex flex-col items-center justify-center text-inherit no-underline">
        <component :is="item.icon" class="h-6 w-6" />
        <span class="font-400 text-sm leading-4">{{ item.title }}</span>
      </router-link>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .main-menu {
    box-shadow: 0px -2px 2px 0px #0000001a;
  }
  .active {
    @apply text-primary;
  }
</style>
