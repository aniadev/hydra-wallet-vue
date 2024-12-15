export const teleApp = window.Telegram.WebApp

export const ready = !!window.Telegram.WebApp.initData

export const Constants = {
  StorageKeys: {
    WalletAddress: 'walletAddress',
    WalletData: 'walletData',
    Rootkey: 'rootkey'
  }
}

export const initializeTelegram = () => {
  if (!ready) {
    return
  }
}

const telegramHelper = {
  teleApp,
  ready,
  storage: teleApp.CloudStorage,
  Constants,
  initializeTelegram
}

export default telegramHelper
