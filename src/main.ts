import './init'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'virtual:uno.css'
import './assets/styles/index.scss'
import 'animate.css'

import { createHead } from '@vueuse/head'
import { createApp } from 'vue'
import App from './App.vue'
import { registerPlugins } from './plugins'
const app = createApp(App)
const head = createHead()

// register plugin
registerPlugins(app)

// config Iconify
import { Icon } from '@iconify/vue'
app.component('Icon', Icon)

// Highlight.js
import 'highlight.js/styles/stackoverflow-light.css'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import hljsVuePlugin from '@highlightjs/vue-plugin'

hljs.registerLanguage('javascript', javascript)
app.use(hljsVuePlugin)

app.use(Antd)
app.use(head)
app.mount('#app')
