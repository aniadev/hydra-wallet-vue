<script lang="ts" setup>
  import IconChoiceScissors from '../assets/svg/choice-scissors.svg?component'
  import IconChoiceRock from '../assets/svg/choice-rock.svg?component'
  import IconChoicePaper from '../assets/svg/choice-paper.svg?component'
  import IconLobbyTable from '../assets/svg/lobby-table.svg?component'
  import IconLobbyPlayer from '../assets/svg/lobby-player.svg?component'

  type AssetEntity = 'LOBBY_TABLE' | 'LOBBY_PLAYER' | 'CHOICE_ROCK' | 'CHOICE_PAPER' | 'CHOICE_SCISSORS'
  const assetEntities: Record<AssetEntity, { src: string; svg?: any }> = {
    LOBBY_TABLE: {
      src: '../assets/svg/lobby-table.svg'
      // svg: IconLobbyTable
    },
    LOBBY_PLAYER: {
      src: '../assets/svg/lobby-player.svg',
      svg: IconLobbyPlayer
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
    }
  }

  const props = withDefaults(
    defineProps<{
      asset: keyof typeof assetEntities
    }>(),
    {
      asset: 'LOBBY_PLAYER'
    }
  )

  const imageSrc = ref('')
  const svgIcon = shallowRef<Component | null>(null)
  onBeforeMount(async () => {
    try {
      imageSrc.value = new URL(`${assetEntities[props.asset].src}`, import.meta.url).href
      svgIcon.value = assetEntities[props.asset].svg
    } catch (error) {
      console.error('Error loading asset:', error)
    }
  })
</script>

<template>
  <component v-if="svgIcon" :is="svgIcon" />
  <img v-else :src="imageSrc" :alt="props.asset" :srcset="imageSrc" />
</template>

<style lang="scss" scoped></style>
