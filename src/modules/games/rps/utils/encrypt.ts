import type { ChoiceType } from '../types/game.type'
import CryptoJs from 'crypto-js'

export const hashChoice = (choice: ChoiceType) => {
  const aesKey = CryptoJs.lib.WordArray.random(8).toString()
  const encrypted = CryptoJs.PBKDF2(choice, aesKey).toString()
  return {
    choice,
    key: aesKey,
    encrypted
  }
}

export const verifyChoice = (choice: ChoiceType, key: string, encrypted: string) => {
  const decrypted = CryptoJs.PBKDF2(choice, key).toString()
  return decrypted === encrypted
}
