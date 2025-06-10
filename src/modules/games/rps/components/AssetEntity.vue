<script lang="ts" setup>
  import IconChoiceScissors from '../assets/svg/choice-scissors.svg?component'
  import IconChoiceRock from '../assets/svg/choice-rock.svg?component'
  import IconChoicePaper from '../assets/svg/choice-paper.svg?component'
  import IconLobbyTable from '../assets/svg/lobby-table.svg?component'
  import IconLobbyPlayer from '../assets/svg/lobby-player.svg?component'
  import IconLobbyLocked from '../assets/svg/lobby-locked.svg?component'

  type AssetEntity =
    | 'BANNER_TEXT'
    | 'LOBBY_TABLE'
    | 'LOBBY_PLAYER'
    | 'LOBBY_LOCKED'
    | 'CHOICE_ROCK'
    | 'CHOICE_PAPER'
    | 'CHOICE_SCISSORS'
    | 'RESULT_WIN'
    | 'RESULT_LOSE'
    | 'RESULT_TIE'
  const assetEntities: Record<AssetEntity, { src: string; svg?: any }> = {
    BANNER_TEXT: {
      src: '../assets/svg/banner-text.svg'
    },
    LOBBY_TABLE: {
      src: '../assets/svg/lobby-table.svg'
      // svg: IconLobbyTable
    },
    LOBBY_PLAYER: {
      src: '../assets/svg/lobby-player.svg',
      svg: IconLobbyPlayer
    },
    LOBBY_LOCKED: {
      src: '../assets/svg/lobby-locked.svg',
      svg: IconLobbyLocked
    },
    CHOICE_ROCK: {
      src: '../assets/svg/choice-rock.svg',
      svg: IconChoiceRock
    },
    CHOICE_PAPER: {
      src: '../assets/svg/choice-paper.svg',
      svg: IconChoicePaper
    },
    CHOICE_SCISSORS: {
      src: '../assets/svg/choice-scissors.svg',
      svg: IconChoiceScissors
    },
    RESULT_WIN: {
      src: '../assets/svg/result-win.svg'
    },
    RESULT_LOSE: {
      src: '../assets/svg/result-lose.svg'
    },
    RESULT_TIE: {
      src: '../assets/svg/result-tie.svg'
    }
  }

  const props = withDefaults(
    defineProps<{
      asset: keyof typeof assetEntities
      size?: string | number
      filled?: boolean
    }>(),
    { filled: false, size: 24 }
  )

  // const imageSrc = ref('')
  // const svgIcon = shallowRef<Component | null>(null)
  // onBeforeMount(async () => {
  //   try {
  //     imageSrc.value = new URL(`${assetEntities[props.asset].src}`, import.meta.url).href
  //     svgIcon.value = assetEntities[props.asset].svg
  //   } catch (error) {
  //     console.error('Error loading asset:', error)
  //   }
  // })

  const icon = ref('')
  watchEffect(async () => {
    try {
      const iconsImport = import.meta.glob('../assets/svg/**.svg', {
        as: 'raw',
        eager: false
      })
      const rawIcon = await iconsImport[assetEntities[props.asset].src]()
      icon.value = rawIcon
    } catch {
      console.error(`[nuxt-icons] Icon '${props.asset}' doesn't exist in 'assets/icons'`)
    }
  })
  const style = computed(() => ({
    fontSize: `${props.size}px`,
    width: `${props.size}px`,
    height: `${props.size}px`
  }))
</script>

<template>
  <!-- <component v-if="svgIcon" :is="svgIcon" class="entity-asset" :style="{ ...svgStyle }" />
  <img v-else :src="imageSrc" :alt="props.asset" :srcset="imageSrc" /> -->
  <span class="nuxt-icon" :style :class="{ 'nuxt-icon--fill': filled }" v-html="icon" />
</template>

<style lang="scss">
  .nuxt-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .nuxt-icon svg {
    width: 100%;
    height: 100%;
    // vertical-align: middle;
  }
  .nuxt-icon.nuxt-icon--fill,
  .nuxt-icon.nuxt-icon--fill * {
    fill: currentColor !important;
  }
</style>
