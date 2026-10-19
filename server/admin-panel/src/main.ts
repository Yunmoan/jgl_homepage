import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(router)
app.use(ElementPlus, { locale: zhCn, size: 'small', zIndex: 3000 })

// Apply persisted theme at startup
const persistedTheme = localStorage.getItem('theme')
if (persistedTheme === 'dark') {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

app.mount('#app')
