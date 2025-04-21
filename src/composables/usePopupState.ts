import type { Popups } from '@/enums/popups.enum'
import { useMainStore } from '@/stores/main'

export const usePopupState = (popupName: Popups, state?: 'open' | 'close') => {
  const mainStore = useMainStore()
  if (state) {
    mainStore.setPopupState(state === 'open', popupName)
  }
  return mainStore.getPopupState(popupName)
}
