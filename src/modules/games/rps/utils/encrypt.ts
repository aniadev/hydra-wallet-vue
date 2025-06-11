import jsSha256 from 'js-sha256'
import type { Choice } from '../types/choice.type'

export const hashChoice = (choice: Choice) => {
  const salt = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const encrypted = jsSha256.sha256.hmac(salt, choice.toString())
  return {
    choice,
    salt,
    encrypted
  }
}

export const verifyChoice = (choice: Choice, key: string, encrypted: string) => {
  const decrypted = jsSha256.sha256.hmac(key, choice.toString())
  return decrypted === encrypted
}
