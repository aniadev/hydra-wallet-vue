<script lang="ts" setup>
  const games = ref([
    {
      id: 1,
      title: 'Rock Paper Scissors',
      description: 'Classic game.',
      image: '/images/examples/game-card-rps.png',
      icon: '/images/examples/game-icon-rps.png',
      route: '/games/rock-paper-scissors',
      isActive: true
    },
    {
      id: 2,
      title: 'PokerZ',
      description: 'Poker game.',
      image: '/images/examples/game-card-poker.png',
      icon: '/images/examples/game-icon-poker.png',
      route: '#',
      isActive: false
    },
    {
      id: 3,
      title: 'Snake',
      description: 'Classic game.',
      image: '/images/examples/game-card-snake.png',
      icon: '/images/examples/game-icon-snake.png',
      route: '#',
      isActive: false
    }
  ])
</script>

<template>
  <div class="flex h-full w-full flex-col justify-between">
    <NetworkBadge />
    <MainHeader />
    <div class="flex-grow-1 scroll-bar-primary mt-4 flex flex-col overflow-y-auto overflow-x-hidden px-4">
      <div class="w-full">
        <span class="font-600 text-secondary text-lg">Suggested for you</span>
        <div class="mt-4 w-full overflow-x-hidden">
          <div class="scroll-bar-hidden flex flex-nowrap gap-4 overflow-x-auto">
            <a-card
              class="w-260px h-220px flex-shrink-0 hover:cursor-pointer"
              :body-style="{ padding: 0, overflow: 'hidden', borderRadius: 0, position: 'relative' }"
              v-for="(item, i) in games"
              :key="i"
              @click="() => item.isActive && $router.push(item.route)"
            >
              <div class="absolute right-1 top-2 z-10" v-if="!item.isActive">
                <a-tag color="#87d068">Comming soon</a-tag>
              </div>
              <div class="w-full" :class="{ 'op-70': !item.isActive }">
                <div class="h-164px w-full">
                  <img :src="item.image" alt="game-card" class="rounded-t-2 h-full w-full object-cover" />
                </div>
                <div class="mt-2 flex w-full justify-between overflow-hidden px-2">
                  <div class="h-10 w-10 flex-shrink-0">
                    <img :src="item.icon" alt="" class="rounded-2 h-full w-full object-cover" />
                  </div>
                  <div class="flex-grow-1 ml-2 overflow-hidden">
                    <span class="text-4 font-500 leading-5">{{ item.title }}</span>
                    <div class="text-3 leading-14px text-gray-5 overflow-hidden text-ellipsis text-nowrap">
                      {{ item.description }}
                    </div>
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </div>
      </div>
      <div class="mt-6 w-full">
        <span class="font-600 text-secondary text-lg">All apps</span>
        <div class="mt-4">
          <a-card
            class="h-84px mb-4 w-full hover:cursor-pointer"
            :body-style="{ padding: '8px', overflow: 'hidden', borderRadius: 0 }"
            v-for="(item, i) in games"
            :key="i"
            @click="() => item.isActive && $router.push(item.route)"
          >
            <div class="flex">
              <div class="h-10 w-10 flex-shrink-0">
                <img :src="item.icon" alt="" class="rounded-2 h-full w-full object-cover" />
              </div>
              <div class="flex-grow-1 ml-2 overflow-hidden">
                <span class="text-4 font-500 leading-5">{{ item.title }}</span>
                <div class="text-3 leading-14px text-gray-5 overflow-hidden text-ellipsis text-nowrap">
                  {{ item.description }}
                </div>
                <a-tag color="#87d068" class="mt-2">1 Activity</a-tag>
              </div>
              <div class="ml-2 h-6 w-6 flex-shrink-0">
                <icon icon="ic:round-arrow-forward" height="24" class="" />
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
