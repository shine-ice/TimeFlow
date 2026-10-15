import { createApp } from 'vue'
import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { BiAlarm } from 'oh-vue-icons/icons'
import router from './router'
import pinia from './stores'
import './styles/index.scss'
import App from './App.vue'

addIcons(BiAlarm)

const app = createApp(App)

app.component('OhVueIcon', OhVueIcon)
app.use(pinia)
app.use(router)
app.mount('#app')
