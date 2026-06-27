import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { VueReCaptcha } from 'vue-recaptcha-v3'

const app = createApp(App)

app.use(router)

router.afterEach((to) => {
  fetch('/api/system/page-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: to.fullPath,
      referrer: document.referrer || null,
    }),
    keepalive: true,
  }).catch(() => undefined)
})

const recaptchaSiteKey =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lf9LSosAAAAACzIRoszgUmT_zlg1QyPZNkM7xn_'

app.use(VueReCaptcha, {
  siteKey: recaptchaSiteKey,
  loaderOptions: {
    useRecaptchaNet: true,
  },
})

app.mount('#app')
