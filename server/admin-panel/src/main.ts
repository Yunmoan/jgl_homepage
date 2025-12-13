import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import './style.css'

// Import v-md-editor
import VMdEditor from '@kangc/v-md-editor';
import '@kangc/v-md-editor/lib/style/base-editor.css';
import vuepressTheme from '@kangc/v-md-editor/lib/theme/vuepress.js';
import '@kangc/v-md-editor/lib/theme/style/vuepress.css';

// Import Prism
import Prism from 'prismjs';

const app = createApp(App)

// Use v-md-editor
VMdEditor.use(vuepressTheme, {
  Prism,
});

app.use(router)
app.use(ElementPlus, { size: 'small', zIndex: 3000 })
app.use(VMdEditor);

// Apply persisted theme at startup
const persistedTheme = localStorage.getItem('theme')
if (persistedTheme === 'dark') {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

app.mount('#app')
