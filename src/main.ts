import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { VueReCaptcha } from 'vue-recaptcha-v3'

const app = createApp(App)

app.use(router)

app.use(VueReCaptcha, {
  siteKey: '6Lf9LSosAAAAACzIRoszgUmT_zlg1QyPZNkM7xn_', // This is a public test key
  loaderOptions: {
    useRecaptchaNet: true, // Use recaptcha.net
  },
})

app.mount('#app')
