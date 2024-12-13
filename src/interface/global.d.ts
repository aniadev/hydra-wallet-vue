import type { Telegram } from './telegram'

declare global {
  interface Window {
    Telegram: Telegram
  }
}
