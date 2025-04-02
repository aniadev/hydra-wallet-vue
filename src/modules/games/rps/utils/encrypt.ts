import type { ChoiceType } from '../types/game.type'
// import CryptoJs from 'crypto-js'
import bcrypt from 'bcryptjs'

export const hashChoice = async (choice: ChoiceType) => {
  console.time('hashChoice')
  // const aesKey = CryptoJs.lib.WordArray.random(8).toString()
  // const encrypted = CryptoJs.PBKDF2(choice, aesKey).toString()
  const salt = await bcrypt.genSalt(10)
  const encrypted = await bcrypt.hash(`${choice}|${salt}`, 4)
  console.timeEnd('hashChoice')
  return {
    choice,
    key: salt,
    encrypted
  }
}

export const verifyChoice = async (choice: ChoiceType, key: string, encrypted: string) => {
  // const decrypted = CryptoJs.PBKDF2(choice, key).toString()
  // return decrypted === encrypted
  const combinded = `${choice}|${key}`
  const valid = await bcrypt.compare(combinded, encrypted)
  return valid
}
