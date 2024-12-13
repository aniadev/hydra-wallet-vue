// Utilities
import { createPinia } from 'pinia'
// @ts-expect-error
import piniaPersist from 'pinia-plugin-persist'

const pinia = createPinia()
pinia.use(piniaPersist)

export default pinia
